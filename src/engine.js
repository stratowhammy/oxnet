import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBackupWorker } from './backupWorker.js';
import { initGoalWorker } from './goalWorker.js';
import { calculatePriceShift } from './lib/marketMath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// In-memory cache of news stories
let newsOutput = [];
try {
    const newsPath = path.join(__dirname, '../news_output.json');
    newsOutput = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
    console.log(`Loaded ${newsOutput.length} news stories`);
} catch (e) {
    console.error("Failed to load news_output.json. Please generate it first.");
    process.exit(1);
}

// In-memory tracker for OHLC intra-interval pricing
let currentCandles = {};

// 1. Record 15-min Price Interval
async function recordPriceHistories() {
    console.log(`[${new Date().toISOString()}] Recording 15-minute price snapshots...`);
    const assets = await prisma.asset.findMany({ select: { id: true, basePrice: true } });

    const historyCreates = assets.map(a => {
        const candle = currentCandles[a.id];
        if (candle) {
            candle.close = a.basePrice;
            candle.high = Math.max(candle.high, a.basePrice);
            candle.low = Math.min(candle.low, a.basePrice);
            return {
                assetId: a.id,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close
            };
        } else {
            return {
                assetId: a.id,
                open: a.basePrice,
                high: a.basePrice,
                low: a.basePrice,
                close: a.basePrice
            };
        }
    });

    await prisma.priceHistory.createMany({
        data: historyCreates
    });

    // Reset memory tracker for the next 15-minute window
    currentCandles = {};

    console.log(`Recorded snapshot for ${assets.length} assets.`);
}

// 2. Publish a News Story every 30 minutes
async function publishNewsStory() {
    // Find a story that hasn't been published yet
    // We'll just randomly select one from the JSON and insert it.
    const randomStory = newsOutput[Math.floor(Math.random() * newsOutput.length)];

    const newStory = await prisma.newsStory.create({
        data: {
            headline: randomStory.Headline,
            context: randomStory.Context,
            targetSector: randomStory.Target_Sector,
            targetSpecialty: randomStory.Target_Specialty,
            impactScope: randomStory.Impact_Scope,
            direction: randomStory.Direction,
            intensityWeight: randomStory.Intensity_Weight,
            competitorInversion: randomStory.Competitor_Inversion
        }
    });

    console.log(`[${new Date().toISOString()}] NEWS PUBLISHED: ${newStory.headline}`);
}

// 3. Trade Simulator (Runs every ~1 minute)
// Apply simulated buy/sell pressure based on active news (last 2 hours)
async function simulateTradeImpacts() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Get active news
    const activeNews = await prisma.newsStory.findMany({
        where: { publishedAt: { gte: twoHoursAgo } }
    });

    if (activeNews.length === 0) return;

    const CENTRAL_BANK_USER_ID = '10101010'; // Using the established central bank string id

    // Ensure central bank exists (for assigning synthetic transactions)
    let centralBank = await prisma.user.findUnique({ where: { id: CENTRAL_BANK_USER_ID } });
    if (!centralBank) {
        centralBank = await prisma.user.create({
            data: { id: CENTRAL_BANK_USER_ID, role: 'ADMIN', deltaBalance: 9999999999 }
        });
    }

    const allAssets = await prisma.asset.findMany();

    for (const story of activeNews) {
        // Determine target assets
        let targets = [];
        if (story.impactScope === 'SECTOR') {
            targets = allAssets.filter(a => a.sector === story.targetSector);
        } else {
            targets = allAssets.filter(a => a.sector === story.targetSector && a.niche === story.targetSpecialty);
        }

        let competitors = [];
        if (story.competitorInversion) {
            // Competitors are other assets in the same sector
            competitors = allAssets.filter(a => a.sector === story.targetSector && !targets.some(t => t.id === a.id));
        }

        // Determine synthetic trade magnitude based on Intensity (1-5)
        // Intensity 5 = strong impact, large quantity
        const baseQuantity = 50 * story.intensityWeight;

        // Direction logic
        const mainAction = story.direction === 'UP' ? 'BUY' : 'SELL';
        const inverseAction = story.direction === 'UP' ? 'SELL' : 'BUY';

        // Execute Synthetic Trades against Targets
        for (const asset of targets) {
            await executeSyntheticTrade(asset, centralBank.id, mainAction, baseQuantity);
        }

        // Execute Synthetic Trades against Competitors (Inverse)
        for (const asset of competitors) {
            await executeSyntheticTrade(asset, centralBank.id, inverseAction, baseQuantity * 0.5); // 50% impact for inversion
        }
    }
}

async function executeSyntheticTrade(asset, userId, action, quantity) {
    // Basic price impact math (slippage logic)
    // Just directly nudging the asset basePrice
    const liquidityRatio = asset.supplyPool > 0 ? quantity / asset.supplyPool : 0.001;
    let priceImpactPercent = Math.min(liquidityRatio * 0.5, 0.05); // cap physical slide to 5% per minute

    if (action === 'SELL') {
        priceImpactPercent *= -1; // price drops
    }

    const newPrice = asset.basePrice * (1 + priceImpactPercent);

    // Write transaction record
    await prisma.transaction.create({
        data: {
            userId: userId,
            assetId: asset.id,
            type: action,
            amount: quantity,
            price: newPrice,
            fee: 0 // Synthetic trades incur no fees
        }
    });

    // Update Asset price natively
    await prisma.asset.update({
        where: { id: asset.id },
        data: { basePrice: newPrice }
    });

    // Update local candle cache for this impact too
    if (!currentCandles[asset.id]) {
        currentCandles[asset.id] = {
            open: asset.basePrice,
            high: Math.max(asset.basePrice, newPrice),
            low: Math.min(asset.basePrice, newPrice),
            close: newPrice
        };
    } else {
        const c = currentCandles[asset.id];
        c.high = Math.max(c.high, newPrice);
        c.low = Math.min(c.low, newPrice);
        c.close = newPrice;
    }
}

// 4. Sinusoidal Market Movements (Every 3 Mins)
async function applySinusoidalMovements() {
    // console.log(`[${new Date().toISOString()}] Applying sinusoidal market forces...`);
    const assets = await prisma.asset.findMany();
    const now = Date.now();

    for (const asset of assets) {
        // Use the shared math library for complex multi-layered noise
        const priceShiftPercent = calculatePriceShift(asset, now);

        const newPrice = asset.basePrice * (1 + priceShiftPercent);

        // Update Asset
        await prisma.asset.update({
            where: { id: asset.id },
            data: { basePrice: newPrice }
        });

        // Track the wick in local memory
        if (!currentCandles[asset.id]) {
            currentCandles[asset.id] = {
                open: asset.basePrice,
                high: Math.max(asset.basePrice, newPrice),
                low: Math.min(asset.basePrice, newPrice),
                close: newPrice
            };
        } else {
            const c = currentCandles[asset.id];
            c.high = Math.max(c.high, newPrice);
            c.low = Math.min(c.low, newPrice);
            c.close = newPrice;
        }
    }
}
// 4. Margin Call Engine
async function checkMarginCalls() {
    console.log(`[${new Date().toISOString()}] Checking Margin Accounts...`);
    const allUsers = await prisma.user.findMany({
        where: {
            OR: [
                { marginLoan: { gt: 0 } },
                { portfolios: { some: { isShortPosition: true } } }
            ]
        },
        include: { portfolios: { include: { asset: true } } }
    });

    for (const user of allUsers) {
        let portfolioEquity = 0;
        for (const p of user.portfolios) {
            const val = p.quantity * p.asset.basePrice;
            if (p.isShortPosition) {
                portfolioEquity -= val;
            } else {
                portfolioEquity += val;
            }
        }

        const totalEquity = user.deltaBalance - user.marginLoan + portfolioEquity;

        // Auto-liquidate if equity falls below 0
        if (totalEquity <= 0 && user.portfolios.length > 0) {
            console.log(`[MARGIN CALL] Liquidating User ${user.id} | Equity: ${totalEquity.toFixed(2)}`);

            for (const p of user.portfolios) {
                // Return assets to pool or take from pool
                const k = p.asset.supplyPool * p.asset.demandPool;
                let newSupply, newDemand;
                if (p.isShortPosition) {
                    // Short cover = Buy. Removes supply.
                    newSupply = Math.max(0.001, p.asset.supplyPool - p.quantity);
                    newDemand = k / newSupply;
                } else {
                    // Sell = Adds supply.
                    newSupply = p.asset.supplyPool + p.quantity;
                    newDemand = k / newSupply;
                }
                await prisma.asset.update({
                    where: { id: p.asset.id },
                    data: { supplyPool: newSupply, demandPool: newDemand }
                });
            }

            // Wipe user portfolio and reset balance to harsh 0 mapping
            await prisma.portfolio.deleteMany({ where: { userId: user.id } });
            await prisma.user.update({
                where: { id: user.id },
                data: { deltaBalance: 0, marginLoan: 0 }
            });
        }
    }
}

// ----- Scheduler Logic -----

// 15 Minutes = 900,000 ms
const FIFTEEN_MINS = 15 * 60 * 1000;
// 30 Minutes = 1,800,000 ms 
const THIRTY_MINS = 30 * 60 * 1000;
// 3 Minutes = 180,000 ms
const THREE_MINS = 3 * 60 * 1000;
// 30 Seconds for simulation loop to feel "live"
const THIRTY_SECONDS = 30 * 1000;

console.log("Starting OxNet Background Engine...");

// Initial kicks
recordPriceHistories();
publishNewsStory();
checkMarginCalls();
applySinusoidalMovements();

// Kick off daily midnight backup cron
initBackupWorker();

// Kick off goal auction processing
initGoalWorker();

setInterval(recordPriceHistories, FIFTEEN_MINS);
setInterval(checkMarginCalls, FIFTEEN_MINS);
setInterval(publishNewsStory, THIRTY_MINS);
setInterval(applySinusoidalMovements, THREE_MINS);
setInterval(simulateTradeImpacts, THIRTY_SECONDS);
