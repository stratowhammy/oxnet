import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 1. Record 15-min Price Interval
async function recordPriceHistories() {
    console.log(`[${new Date().toISOString()}] Recording 15-minute price snapshots...`);
    const assets = await prisma.asset.findMany({ select: { id: true, basePrice: true } });

    const historyCreates = assets.map(a => ({
        assetId: a.id,
        price: a.basePrice
    }));

    await prisma.priceHistory.createMany({
        data: historyCreates
    });
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
}

// ----- Scheduler Logic -----

// 15 Minutes = 900,000 ms
const FIFTEEN_MINS = 15 * 60 * 1000;
// 30 Minutes = 1,800,000 ms 
const THIRTY_MINS = 30 * 60 * 1000;
// 30 Seconds for simulation loop to feel "live"
const THIRTY_SECONDS = 30 * 1000;

console.log("Starting OxNet Background Engine...");

// Initial kicks
recordPriceHistories();
publishNewsStory();

setInterval(recordPriceHistories, FIFTEEN_MINS);
setInterval(publishNewsStory, THIRTY_MINS);
setInterval(simulateTradeImpacts, THIRTY_SECONDS);
