import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBackupWorker } from './backupWorker.js';
import { initGoalWorker } from './goalWorker.js';
import { calculatePriceShift } from './lib/marketMath.js';
import { runProductionCycle, PRODUCTION_CYCLE_INTERVAL } from './productionWorker.js';
import { runLabourMarketUpdate } from './labourWorker.js';
import { runMunicipalUpdate } from './municipalWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

let aiContextText = '';
const contextPath = path.join(__dirname, '../ai_news_context.md');

function reloadAIContext() {
    try {
        aiContextText = fs.readFileSync(contextPath, 'utf8');
    } catch (e) {
        console.error("Warning: ai_news_context.md not found.");
    }
}
reloadAIContext();

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

    // Reset memory tracker for the next 5-minute window
    currentCandles = {};

    console.log(`Recorded snapshot for ${assets.length} assets.`);
}

// 2. Publish a News Story every 30 minutes
export async function publishNewsStory() {
    const allAssets = await prisma.asset.findMany();
    if (allAssets.length === 0) return;

    // Pick random target asset for news
    const targetAsset = allAssets[Math.floor(Math.random() * allAssets.length)];
    const sector = targetAsset.sector;
    const niche = targetAsset.niche;
    const companyName = targetAsset.name;

    console.log(`Generating AI news story for ${companyName} (${sector} - ${niche})...`);

    // Fetch historical context
    // Reduced from 10 to 3 to prevent "Context size has been exceeded" errors with small local models
    const dbHistory = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 3
    });
    let historyLines = "No recent events recorded in history yet.";
    if (dbHistory.length > 0) {
        historyLines = dbHistory.map(item => `[${item.targetSector} - ${new Date(item.publishedAt).toLocaleDateString()}] ${item.headline}\nContent: ${item.context}`).join('\n\n');
    }

    // Fetch details for the target asset and its sector colleagues to create a focused, "thin" context
    const sectorColleagues = await prisma.asset.findMany({
        where: { sector: sector, symbol: { not: 'DELTA' } },
        select: { name: true, symbol: true, niche: true, description: true, basePrice: true, supplyPool: true, demandPool: true }
    });

    const assetDetailsLines = sectorColleagues.map(a =>
        `- **${a.name}** (${a.symbol})\n  Niche: ${a.niche}\n  Price: Δ${a.basePrice.toFixed(2)} | Supply: ${a.supplyPool.toFixed(0)} | Demand: ${a.demandPool.toFixed(0)}\n  Description: ${a.description}`
    ).join('\n\n');

    const rulesAndIdentity = `
# OxNet News Engine Rules
You are the central intelligence behind the OxNet global economic simulation. Output purely functional JSON to manipulate the fictional economy.
- No real-world companies exist.
- Tone: Professional, objective, 8th-grade reading level.
- Format: Strictly JSON { Headline, Story (5 lines), Expected_Economic_Outcome (2 lines), Direction, Intensity_Weight, Competitor_Inversion }.
`;

    const prompt = `
${rulesAndIdentity}

## Contextual Details for ${sector} Sector
${assetDetailsLines}

**NEW STORY REQUEST**
Target: "${companyName}" (${targetAsset.symbol})
Sector: "${sector}"
Niche: "${niche}"

Recent Historical News Events:
${historyLines}

CRITICAL: Subject must be '${companyName}'. Impact must be logical based on niche. No unlisted companies.
`;

    let aiData;
    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: "system", content: "You are a highly capable AI trained to output pure JSON data only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                const content = data.choices[0].message.content.trim();
                const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                aiData = JSON.parse(cleaned);
            }
        } else {
            console.error(`LLM Generation responded with HTTP ${response.status}`);
            const errText = await response.text();
            console.error("LLM Error Details:", errText);
        }
    } catch (e) {
        console.error("LLM Generation failed:", e.message);
    }

    if (!aiData) {
        // Fallback
        const isUp = Math.random() > 0.5;
        aiData = {
            Headline: `Breakthrough in ${niche}`,
            Story: `Advances in ${niche} hold promise for the future. The companies involved are poised to take advantage of these new developments, leading to a new era of growth.`,
            Expected_Economic_Outcome: `This should establish a stable outlook for the sector.`,
            Direction: isUp ? "UP" : "DOWN",
            Intensity_Weight: Math.floor(Math.random() * 5) + 1,
            Competitor_Inversion: Math.random() > 0.7
        };
    }

    // Harden AI outputs: Ensure correct types for Prisma
    const direction = (String(aiData.Direction || 'UP').toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
    const intensity = Number(aiData.Intensity_Weight) || 3;
    const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

    try {
        const newStory = await prisma.newsStory.create({
            data: {
                headline: aiData.Headline || "Market Update",
                context: `${aiData.Story}\n\n**Expected Economic Outcome**\n\n${aiData.Expected_Economic_Outcome}`,
                targetSector: sector,
                targetSpecialty: niche,
                impactScope: Math.random() > 0.5 ? "SECTOR" : "SPECIALTY",
                direction: direction,
                intensityWeight: intensity,
                competitorInversion: inversion
            }
        });

        console.log(`[AI News] Published: ${newStory.headline}`);
    } catch (dbErr) {
        console.error("Failed to save AI news story to DB:", dbErr.message);
    }
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

        // Calculate age of story in minutes to model natural market digestion
        const ageInMinutes = story.publishedAt ? (Date.now() - new Date(story.publishedAt).getTime()) / (1000 * 60) : 9999;

        // Exponential decay: volume spikes immediately upon release, then rapidly normalizes (half-life of 15m)
        const decayFactor = Math.exp(-ageInMinutes / 15);

        // Inject volume noise (between 0.3x and 1.7x) so volume bars are staggered organically
        const volumeNoise = 0.3 + (Math.random() * 1.4);

        // Determine synthetic trade magnitude based on Intensity (1-5) and scale by decay/noise
        const baseQuantity = 50 * story.intensityWeight * decayFactor * volumeNoise;

        // Skip negligible phantom trades once the news has fully faded
        if (baseQuantity < 1) continue;

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
    // DELTA is the fiat currency — never allow its price to change
    if (asset.symbol === 'DELTA') return;

    // Basic price impact math (slippage logic)
    const liquidityRatio = asset.supplyPool > 0 ? quantity / asset.supplyPool : 0.001;
    let priceImpactPercent = Math.min(liquidityRatio * 0.5, 0.05); // cap physical slide to 5% per minute

    // Jitter the price slice to create authentic candle wicks and bodies
    priceImpactPercent *= (0.6 + Math.random() * 0.8);

    if (action === 'SELL') {
        priceImpactPercent *= -1; // price drops
    }

    const newPrice = asset.basePrice * (1 + priceImpactPercent);

    // Sync demandPool to maintain the price ratio (P = D/S)
    const newDemand = newPrice * asset.supplyPool;

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

    // Update Asset price and pools natively
    await prisma.asset.update({
        where: { id: asset.id },
        data: { basePrice: newPrice, demandPool: newDemand }
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

// 4. Sinusoidal Market Movements (Every 1 Min)
async function applySinusoidalMovements() {
    // console.log(`[${new Date().toISOString()}] Applying sinusoidal market forces...`);
    const assets = await prisma.asset.findMany();
    const now = Date.now();

    for (const asset of assets) {
        // DELTA is the fiat currency — never allow its price to change
        if (asset.symbol === 'DELTA') continue;

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

    // Safety net: always reset DELTA to 1:1 parity
    await prisma.asset.updateMany({
        where: { symbol: 'DELTA' },
        data: { basePrice: 1.00 }
    });
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

// 5. Conditional Order Engine (TP / SL)
async function checkConditionalOrders() {
    // console.log(`[${new Date().toISOString()}] Checking Conditional Orders...`);

    // Find any portfolio with a TP or SL set
    const activeConditions = await prisma.portfolio.findMany({
        where: {
            OR: [
                { takeProfitPrice: { not: null } },
                { stopLossPrice: { not: null } }
            ]
        },
        include: { asset: true, user: true }
    });

    for (const p of activeConditions) {
        let shouldExecute = false;
        const currentPrice = p.asset.basePrice;

        if (p.isShortPosition) {
            // For shorts, TP is below entry, SL is above entry
            if (p.takeProfitPrice !== null && currentPrice <= p.takeProfitPrice) shouldExecute = true;
            if (p.stopLossPrice !== null && currentPrice >= p.stopLossPrice) shouldExecute = true;
        } else {
            // For longs, TP is above entry, SL is below entry
            if (p.takeProfitPrice !== null && currentPrice >= p.takeProfitPrice) shouldExecute = true;
            if (p.stopLossPrice !== null && currentPrice <= p.stopLossPrice) shouldExecute = true;
        }

        if (shouldExecute) {
            console.log(`[CONDITIONAL TRIGGER] Executing TP/SL for User ${p.userId} on Asset ${p.asset.symbol}`);
            const k = p.asset.supplyPool * p.asset.demandPool;
            let newSupply, newDemand, proceeds, fee;
            const executionPrice = currentPrice;

            if (p.isShortPosition) {
                // Covering Short = User *buys* from pool
                newSupply = Math.max(0.001, p.asset.supplyPool - p.quantity);
                newDemand = k / newSupply;

                // When they shorted, they gained delta. To close, they must pay back the current value.
                const notionalCost = p.quantity * executionPrice;
                fee = notionalCost * 0.005;
                proceeds = -notionalCost - fee; // Delta adjustment

            } else {
                // Selling Long = User *sells* to pool
                newSupply = p.asset.supplyPool + p.quantity;
                newDemand = k / newSupply;

                const returnAmount = p.quantity * executionPrice;
                fee = returnAmount * 0.005;
                proceeds = returnAmount - fee;
            }

            // Pay back margin loan if any
            let loanToPay = 0;
            let deltaToAdd = proceeds;
            if (!p.isShortPosition && p.user.marginLoan > 0) {
                // If they are selling a long and have a loan, pay it off first
                loanToPay = Math.min(Math.max(0, proceeds), p.user.marginLoan); // Don't pay negative proceeds towards loan
                deltaToAdd = proceeds - loanToPay;
            } else if (p.isShortPosition && proceeds < 0) {
                // If covering short requires paying capital, subtract it directly from balance
                deltaToAdd = proceeds;
            }

            const txOps = [
                prisma.user.update({
                    where: { id: p.userId },
                    data: {
                        deltaBalance: { increment: deltaToAdd },
                        marginLoan: loanToPay > 0 ? { decrement: loanToPay } : undefined
                    }
                }),
                prisma.asset.update({
                    where: { id: p.assetId },
                    data: { supplyPool: newSupply, demandPool: newDemand }
                }),
                prisma.transaction.create({
                    data: {
                        userId: p.userId,
                        assetId: p.assetId,
                        type: p.isShortPosition ? 'COND_COVER' : 'COND_SELL',
                        amount: p.quantity,
                        price: executionPrice,
                        fee
                    }
                }),
                prisma.portfolio.delete({ where: { id: p.id } })
            ];

            await prisma.$transaction(txOps);
        }
    }
}

async function executeLimitOrders() {
    try {
        const pendingOrders = await prisma.limitOrder.findMany({
            where: { status: 'PENDING' },
            include: { asset: true }
        });

        for (const order of pendingOrders) {
            const currentPrice = order.asset.basePrice;
            let triggered = false;

            if (order.type === 'BUY' || order.type === 'COVER') {
                if (currentPrice <= order.price) triggered = true;
            } else if (order.type === 'SELL' || order.type === 'SHORT') {
                if (currentPrice >= order.price) triggered = true;
            }

            if (triggered) {
                console.log(`[Limit] Order ${order.id} triggered: ${order.type} ${order.quantity} of ${order.asset.symbol} at ${currentPrice}`);

                // Call the existing trade API to process it fully via AMM
                const res = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/trade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: order.userId,
                        assetId: order.assetId,
                        type: order.type,
                        quantity: order.quantity,
                        leverage: order.leverage
                    })
                });

                if (res.ok) {
                    await prisma.limitOrder.update({
                        where: { id: order.id },
                        data: { status: 'EXECUTED' }
                    });
                    console.log(`[Limit] Order ${order.id} EXECUTED.`);
                } else {
                    const err = await res.json();
                    console.error(`[Limit] Failed to execute order ${order.id}:`, err);
                    // If it failed because of insufficient funds, we might cancel it:
                    if (err.error && err.error.toLowerCase().includes('insufficient')) {
                        await prisma.limitOrder.update({
                            where: { id: order.id },
                            data: { status: 'CANCELLED' }
                        });
                        console.log(`[Limit] Order ${order.id} CANCELLED due to insufficient funds.`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error evaluating limit orders:", e);
    }
}


// ----- CEO Decision-Driven News -----

async function processCeoDecisions() {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Find CEO scenarios answered > 10 min ago that haven't produced a news story yet
        const pendingDecisions = await prisma.ceoScenario.findMany({
            where: {
                chosenOption: { not: null },
                newsPublished: false,
                answeredAt: { lte: tenMinutesAgo },
            },
            include: {
                user: { select: { username: true } },
                asset: { select: { name: true, symbol: true, sector: true, niche: true } },
            }
        });

        for (const decision of pendingDecisions) {
            try {
                const choiceText = decision.chosenOption === 'A' ? decision.choiceA
                    : decision.chosenOption === 'B' ? decision.choiceB
                        : decision.choiceC;

                console.log(`[CEO News] Processing decision from ${decision.user.username} for ${decision.asset.symbol}...`);

                const colleagueInfo = await prisma.asset.findMany({
                    where: { sector: decision.asset.sector, symbol: { not: 'DELTA' } },
                    select: { name: true, symbol: true, niche: true, description: true }
                });

                const sectorContext = colleagueInfo.map(a => `- ${a.name} (${a.symbol}): ${a.niche}`).join('\n');

                const rulesAndIdentity = `
# OxNet News Engine Rules
You are the central intelligence behind the OxNet global economic simulation. Output purely functional JSON to manipulate the fictional economy.
- No real-world companies exist.
- Tone: Professional, objective, 8th-grade reading level.
- Format: Strictly JSON { Headline, Story (5 lines), Expected_Economic_Outcome (2 lines), Direction, Intensity_Weight, Competitor_Inversion }.
`;

                const prompt = `
${rulesAndIdentity}

## Sector Context: ${decision.asset.sector}
${sectorContext}

**CEO DECISION NEWS STORY**
The CEO of "${decision.asset.name}" (${decision.asset.symbol}) in the ${decision.asset.sector} sector (${decision.asset.niche}) was faced with this situation:

"${decision.question}"

They chose: "${choiceText}"

Write a news story about this CEO decision and its market impact. The story should feel like a real financial news article. Output standard JSON.
`;

                let aiData;
                try {
                    const response = await fetch(LLM_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: LLM_MODEL,
                            messages: [
                                { role: 'system', content: 'You are a highly capable AI trained to output pure JSON data only.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.choices?.[0]?.message?.content) {
                            const content = data.choices[0].message.content.trim();
                            const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                            aiData = JSON.parse(cleaned);
                        }
                    }
                } catch (e) {
                    console.error('CEO news generation failed:', e.message);
                }

                if (!aiData) {
                    const isUp = Math.random() > 0.5;
                    aiData = {
                        Headline: `${decision.asset.name} CEO Makes Bold Strategic Move`,
                        Story: `The leadership at ${decision.asset.name} has made a significant strategic decision that analysts believe could reshape the company's position in the ${decision.asset.niche} market. The CEO's choice to ${choiceText.toLowerCase()} has drawn attention from institutional investors and competitors alike.`,
                        Expected_Economic_Outcome: `Market observers anticipate this could have meaningful implications for the broader ${decision.asset.sector} sector in the coming sessions.`,
                        Direction: isUp ? 'UP' : 'DOWN',
                        Intensity_Weight: Math.floor(Math.random() * 5) + 3,
                        Competitor_Inversion: Math.random() > 0.6
                    };
                }

                // Harden AI outputs: Ensure correct types for Prisma
                const direction = (String(aiData.Direction || 'UP').toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
                const intensity = Number(aiData.Intensity_Weight) || 3;
                const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

                try {
                    await prisma.newsStory.create({
                        data: {
                            headline: aiData.Headline || `${decision.asset.name}: CEO Decision Shakes Market`,
                            context: `${aiData.Story}\n\n**Expected Economic Outcome**\n\n${aiData.Expected_Economic_Outcome}`,
                            targetSector: decision.asset.sector,
                            targetSpecialty: decision.asset.niche,
                            impactScope: 'SPECIALTY',
                            direction: direction,
                            intensityWeight: intensity,
                            competitorInversion: inversion,
                        }
                    });

                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true },
                    });

                    console.log(`[CEO News] Published story for ${decision.asset.symbol} based on CEO decision.`);
                } catch (dbErr) {
                    console.error(`Failed to save CEO news story to DB for ${decision.asset.symbol}:`, dbErr.message);
                    // Mark as published anyway to avoid infinite retry loops if the data is consistently bad
                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true },
                    });
                }
            } catch (innerErr) {
                console.error(`Error processing individual CEO decision for ${decision.asset.symbol}:`, innerErr);
                // Try to mark as published to avoid retry loop
                try {
                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true }
                    });
                } catch { }
            }
        }
    } catch (e) {
        console.error('Error processing CEO decisions:', e);
    }
}

// ----- Hedge Fund Manager Performance Check -----

async function checkHedgeFundPerformance() {
    try {
        const hedgeFundManagers = await prisma.user.findMany({
            where: { playerRole: 'HEDGE_FUND' },
            include: {
                portfolios: {
                    include: { asset: true }
                }
            }
        });

        for (const hfm of hedgeFundManagers) {
            // Calculate total fund value = hedgeFundBalance + portfolio mark-to-market
            let portfolioValue = 0;
            for (const p of hfm.portfolios) {
                if (p.isShortPosition) {
                    // Short: profit = (entry - current) * qty
                    portfolioValue += (p.averageEntryPrice - p.asset.basePrice) * p.quantity;
                } else {
                    portfolioValue += p.asset.basePrice * p.quantity;
                }
            }
            const totalFundValue = hfm.hedgeFundBalance + portfolioValue;

            if (totalFundValue < 7_500_000) {
                console.log(`[HFM] ${hfm.username} fund value (${totalFundValue.toFixed(2)}) below 7.5M threshold — demoting to RETAIL.`);
                await prisma.user.update({
                    where: { id: hfm.id },
                    data: {
                        playerRole: 'RETAIL',
                        hedgeFundBalance: 0,
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error checking HFM performance:', e);
    }
}


// ----- Sector Index Recording -----

async function recordSectorIndices() {
    try {
        const assets = await prisma.asset.findMany({
            where: { symbol: { not: 'DELTA' } },
            select: { sector: true, basePrice: true }
        });

        const sectorPrices = {};
        for (const asset of assets) {
            if (!sectorPrices[asset.sector]) sectorPrices[asset.sector] = [];
            sectorPrices[asset.sector].push(asset.basePrice);
        }

        const records = Object.entries(sectorPrices).map(([sector, prices]) => ({
            sector,
            indexPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        }));

        await prisma.sectorIndex.createMany({ data: records });
        console.log(`[${new Date().toISOString()}] Recorded sector indices for ${records.length} sectors.`);
    } catch (e) {
        console.error('Error recording sector indices:', e);
    }
}

// ----- Dynamic AI Context Refresh -----

async function refreshAIContext() {
    try {
        const { generateAIContext } = await import('./generate_context.mjs');
        await generateAIContext();
        reloadAIContext();
    } catch (e) {
        console.error('Error refreshing AI context:', e);
    }
}


// ----- Scheduler Logic -----

// Timing Constants
const FIVE_MINS = 5 * 60 * 1000;
const FIFTEEN_MINS = 15 * 60 * 1000;
const THIRTY_MINS = 30 * 60 * 1000;
const ONE_MIN = 60 * 1000;
const TWO_MINS = 2 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;

// Dynamic scheduler state
let lastNewsPublishTime = 0;
let mondayQueueReleased = false; // Prevents double-release on the same Monday

// Helper: check if current time is within trading hours (8 AM - 4 PM EST, Mon-Fri)
async function isWithinTradingHours() {
    const newsMode = await getSetting('NEWS_MODE');
    if (newsMode === '24_7') return true;

    const now = new Date();
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const est = new Date(estString);
    const day = est.getDay(); // 0=Sun, 6=Sat
    const hour = est.getHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}

// Helper: check if it's Monday 8 AM EST (within a 2-minute window)
function isMondayMorning() {
    const now = new Date();
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const est = new Date(estString);
    return est.getDay() === 1 && est.getHours() === 8 && est.getMinutes() < 2;
}

// Helper: read a GlobalSetting key, returns value string or null
async function getSetting(key) {
    try {
        const s = await prisma.globalSetting.findUnique({ where: { key } });
        return s?.value ?? null;
    } catch { return null; }
}

// ----- Dynamic News Scheduler (runs every 1 min) -----
async function dynamicNewsScheduler() {
    try {
        const newsMode = (await getSetting('NEWS_MODE')) || 'TRADING_HOURS';
        const now = Date.now();

        if (newsMode === '24_7') {
            // Mode A: Publish every 30 minutes, all day, every day
            if (now - lastNewsPublishTime >= THIRTY_MINS) {
                reloadAIContext();
                await publishNewsStory();
                lastNewsPublishTime = now;
            }
        } else {
            // Mode B: Publish every 15 minutes, only during trading hours
            if (!isWithinTradingHours()) {
                return; // Skip entirely outside market hours
            }
            if (now - lastNewsPublishTime >= FIFTEEN_MINS) {
                reloadAIContext();
                await publishNewsStory();
                lastNewsPublishTime = now;
            }
        }
    } catch (e) {
        console.error("Error in dynamic news scheduler:", e);
    }
}

// ----- Monday Morning Queue Release -----
async function releaseMondayQueue() {
    try {
        // Only run on Monday 8 AM and only once per Monday
        if (!isMondayMorning()) {
            mondayQueueReleased = false; // Reset flag for next Monday
            return;
        }
        if (mondayQueueReleased) return;

        const queued = await prisma.newsStory.findMany({
            where: { publishedAt: null },
            orderBy: { id: 'asc' }
        });

        if (queued.length === 0) return;

        console.log(`[Monday Queue] Releasing ${queued.length} queued CEO decision stories...`);

        // Drip-release stories with staggered timestamps (30 seconds apart)
        for (let i = 0; i < queued.length; i++) {
            const releaseTime = new Date(Date.now() + i * 30000); // 30s apart
            await prisma.newsStory.update({
                where: { id: queued[i].id },
                data: { publishedAt: releaseTime }
            });
            console.log(`[Monday Queue] Released: ${queued[i].headline}`);
        }

        mondayQueueReleased = true;
        console.log(`[Monday Queue] All ${queued.length} stories released.`);
    } catch (e) {
        console.error('Error releasing Monday queue:', e);
    }
}

// ----- CEO Decision Processor (mode-aware) -----
async function scheduledProcessCeoDecisions() {
    try {
        const newsMode = (await getSetting('NEWS_MODE')) || 'TRADING_HOURS';

        if (newsMode === '24_7') {
            // In 24/7 mode, always process immediately
            await processCeoDecisions();
            return;
        }

        // Trading Hours mode — check sub-toggle
        const immediateStr = await getSetting('CEO_NEWS_IMMEDIATE');
        const immediate = immediateStr === 'true';

        if (immediate) {
            // CEO stories publish immediately regardless of time
            await processCeoDecisions();
            return;
        }

        // Queue mode: generate stories but don't publish yet
        await processCeoDecisionsQueued();
    } catch (e) {
        console.error('Error in scheduled CEO decision processing:', e);
    }
}

// Generate CEO decision stories but queue them (publishedAt = null)
async function processCeoDecisionsQueued() {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const pendingDecisions = await prisma.ceoScenario.findMany({
            where: {
                chosenOption: { not: null },
                newsPublished: false,
                answeredAt: { lte: tenMinutesAgo },
            },
            include: {
                user: { select: { username: true } },
                asset: { select: { name: true, symbol: true, sector: true, niche: true } },
            }
        });

        for (const decision of pendingDecisions) {
            try {
                const choiceText = decision.chosenOption === 'A' ? decision.choiceA
                    : decision.chosenOption === 'B' ? decision.choiceB
                        : decision.choiceC;

                console.log(`[CEO News QUEUED] Generating story for ${decision.asset.symbol} (will release Monday 8AM)...`);

                const colleagueInfo = await prisma.asset.findMany({
                    where: { sector: decision.asset.sector, symbol: { not: 'DELTA' } },
                    select: { name: true, symbol: true, niche: true, description: true }
                });

                const sectorContext = colleagueInfo.map(a => `- ${a.name} (${a.symbol}): ${a.niche}`).join('\n');

                const rulesAndIdentity = `
# OxNet News Engine Rules
You are the central intelligence behind the OxNet global economic simulation. Output purely functional JSON to manipulate the fictional economy.
- No real-world companies exist.
- Tone: Professional, objective, 8th-grade reading level.
- Format: Strictly JSON { Headline, Story (5 lines), Expected_Economic_Outcome (2 lines), Direction, Intensity_Weight, Competitor_Inversion }.
`;

                const prompt = `
${rulesAndIdentity}

## Sector Context: ${decision.asset.sector}
${sectorContext}

**CEO DECISION NEWS STORY**
The CEO of "${decision.asset.name}" (${decision.asset.symbol}) in the ${decision.asset.sector} sector (${decision.asset.niche}) was faced with this situation:

"${decision.question}"

They chose: "${choiceText}"

Write a news story about this CEO decision and its market impact. The story should feel like a real financial news article. Output standard JSON.
`;

                let aiData;
                try {
                    const response = await fetch(LLM_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: LLM_MODEL,
                            messages: [
                                { role: 'system', content: 'You are a highly capable AI trained to output pure JSON data only.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.choices?.[0]?.message?.content) {
                            const content = data.choices[0].message.content.trim();
                            const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                            aiData = JSON.parse(cleaned);
                        }
                    }
                } catch (e) {
                    console.error('CEO news generation failed:', e.message);
                }

                if (!aiData) {
                    const isUp = Math.random() > 0.5;
                    aiData = {
                        Headline: `${decision.asset.name} CEO Makes Bold Strategic Move`,
                        Story: `The leadership at ${decision.asset.name} has made a significant strategic decision that analysts believe could reshape the company's position in the ${decision.asset.niche} market. The CEO's choice to ${choiceText.toLowerCase()} has drawn attention from institutional investors and competitors alike.`,
                        Expected_Economic_Outcome: `Market observers anticipate this could have meaningful implications for the broader ${decision.asset.sector} sector in the coming sessions.`,
                        Direction: isUp ? 'UP' : 'DOWN',
                        Intensity_Weight: Math.floor(Math.random() * 5) + 3,
                        Competitor_Inversion: Math.random() > 0.6
                    };
                }

                const direction = (String(aiData.Direction || 'UP').toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
                const intensity = Number(aiData.Intensity_Weight) || 3;
                const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

                try {
                    // Queued: publishedAt = null (will be released Monday 8 AM)
                    await prisma.newsStory.create({
                        data: {
                            headline: aiData.Headline || `${decision.asset.name}: CEO Decision Shakes Market`,
                            context: `${aiData.Story}\n\n**Expected Economic Outcome**\n\n${aiData.Expected_Economic_Outcome}`,
                            targetSector: decision.asset.sector,
                            targetSpecialty: decision.asset.niche,
                            impactScope: 'SPECIALTY',
                            direction: direction,
                            intensityWeight: intensity,
                            competitorInversion: inversion,
                            publishedAt: null, // QUEUED — released on Monday 8AM
                        }
                    });

                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true },
                    });

                    console.log(`[CEO News QUEUED] Story queued for ${decision.asset.symbol}.`);
                } catch (dbErr) {
                    console.error(`Failed to queue CEO news story for ${decision.asset.symbol}:`, dbErr.message);
                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true },
                    });
                }
            } catch (innerErr) {
                console.error(`Error processing individual queued CEO decision for ${decision.asset.symbol}:`, innerErr);
                try {
                    await prisma.ceoScenario.update({
                        where: { id: decision.id },
                        data: { newsPublished: true }
                    });
                } catch { }
            }
        }
    } catch (e) {
        console.error('Error processing CEO decisions (queued):', e);
    }
}


// ===== ELECTION ENGINE =====

const NPC_NAMES = [
    'Margaret Thornberry', 'Victor Castellano', 'Priya Subramaniam', 'Henry Ashworth',
    'Diane Wu-Ortega', 'Samuel Bancroft', 'Elena Kozlov', 'Marcus Okonkwo',
    'Patricia Sterling', 'Rajesh Dhawan', 'Sofia Marchetti', 'William Bryce',
    'Amara Nwosu', 'Thomas Blackwell', 'Chen Liwei', 'Isabella Fontaine',
    'David Rutherford', 'Keiko Tanaka', 'George Pemberton', 'Nadia Petrov',
];

const NPC_BIOS = [
    'A veteran public servant with decades of community experience.',
    'A former educator who believes in grassroots governance.',
    'A local business leader focused on economic growth and jobs.',
    'A community organizer passionate about infrastructure reform.',
    'An environmental advocate pushing for sustainable development.',
    'A fiscal conservative known for budget discipline.',
    'A progressive reformer with a bold vision for the future.',
    'A former military officer emphasizing security and order.',
    'A healthcare professional campaigning on public wellness.',
    'A tech entrepreneur proposing digital modernization.',
];

// Check if we need to create new elections (runs every 30 min)
async function manageElections() {
    try {
        const municipalities = await prisma.municipality.findMany();

        for (const muni of municipalities) {
            // Check if there's already an active election for this municipality
            const activeElection = await prisma.election.findFirst({
                where: {
                    municipalityId: muni.id,
                    status: { in: ['CAMPAIGNING', 'VOTING'] }
                }
            });

            if (activeElection) {
                // Manage existing election lifecycle
                const now = new Date();

                if (activeElection.status === 'CAMPAIGNING' && now >= new Date(activeElection.votingStart)) {
                    // Transition to voting
                    await prisma.election.update({
                        where: { id: activeElection.id },
                        data: { status: 'VOTING' }
                    });
                    await prisma.municipalEvent.create({
                        data: {
                            municipalityId: muni.id,
                            eventType: 'ELECTION',
                            title: `🗳️ Voting Now Open — ${activeElection.electionType} Election`,
                            content: `Polls are now open for the ${activeElection.electionType.toLowerCase()} election in ${muni.name}. All residents are encouraged to cast their ballot before polls close.`,
                        }
                    });
                    console.log(`[Election] ${muni.name} — ${activeElection.electionType} election now in VOTING phase.`);
                }

                if (activeElection.status === 'VOTING' && now >= new Date(activeElection.votingEnd)) {
                    // Tally votes and close election
                    await tallyElection(activeElection.id, muni);
                }

                continue; // Don't create a new election while one is active
            }

            // Check when the last election was completed
            const lastElection = await prisma.election.findFirst({
                where: { municipalityId: muni.id, status: 'COMPLETED' },
                orderBy: { votingEnd: 'desc' }
            });

            // Create a new election if none exists or the last one ended more than 3 days ago
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            if (!lastElection || new Date(lastElection.votingEnd) < threeDaysAgo) {
                await createElection(muni, 'COUNCIL', 1);
            }
        }
    } catch (e) {
        console.error('Error managing elections:', e);
    }
}

// Check federal elections (Rep, Senator, President) in the Capital District
async function manageFederalElections() {
    try {
        const muni = await prisma.municipality.findUnique({ where: { id: 'capital-district' } });
        if (!muni) return;

        const syncTargets = [
            { type: 'REPRESENTATIVE', rank: 2, count: 5, cooldown: 5 }, // 5 days
            { type: 'SENATOR', rank: 3, count: 3, cooldown: 10 },        // 10 days
            { type: 'PRESIDENT', rank: 4, count: 1, cooldown: 20 }         // 20 days
        ];

        for (const target of syncTargets) {
            const active = await prisma.election.findFirst({
                where: { municipalityId: muni.id, electionType: target.type, status: { in: ['CAMPAIGNING', 'VOTING'] } }
            });

            if (active) {
                const now = new Date();
                if (active.status === 'CAMPAIGNING' && now >= new Date(active.votingStart)) {
                    await prisma.election.update({ where: { id: active.id }, data: { status: 'VOTING' } });
                    console.log(`[Federal Election] ${target.type} now in VOTING.`);
                }
                if (active.status === 'VOTING' && now >= new Date(active.votingEnd)) {
                    await tallyElection(active.id, muni, target.type, target.rank);
                }
                continue;
            }

            const last = await prisma.election.findFirst({
                where: { municipalityId: muni.id, electionType: target.type, status: 'COMPLETED' },
                orderBy: { votingEnd: 'desc' }
            });

            const cooldownMs = target.cooldown * 24 * 60 * 60 * 1000;
            if (!last || new Date(last.votingEnd).getTime() < Date.now() - cooldownMs) {
                await createElection(muni, target.type, target.rank);
            }
        }
    } catch (e) {
        console.error('manageFederalElections error:', e);
    }
}

/**
 * Resolves active policy proposals that have reached their deadline.
 */
async function managePolicyLifecycle() {
    try {
        const now = new Date();
        const expired = await prisma.policyProposal.findMany({
            where: {
                status: 'VOTING',
                endsAt: { lte: now }
            }
        });

        for (const policy of expired) {
            const passed = policy.votesFor > policy.votesAgainst;
            const finalStatus = passed ? 'PASSED' : 'FAILED';

            console.log(`[Policy] Resolving policy ${policy.title}: ${finalStatus} (${policy.votesFor} For, ${policy.votesAgainst} Against).`);

            await prisma.policyProposal.update({
                where: { id: policy.id },
                data: { status: finalStatus }
            });

            // Trigger news on PASS
            if (passed) {
                await prisma.newsStory.create({
                    data: {
                        headline: `Legislative Alert: ${policy.title} HAS PASSED!`,
                        context: `The federal assembly has voted in favor of ${policy.title}. Analysts expect a major impact on the ${policy.targetSector || 'national'} economy. ${policy.description}`,
                        targetSector: policy.targetSector || 'GENERAL',
                        targetSpecialty: 'National Policy',
                        impactScope: policy.targetSector ? 'SECTOR' : 'GLOBAL',
                        direction: policy.policyType === 'SUBSIDY' ? 'UP' : 'DOWN',
                        intensityWeight: 1,
                        competitorInversion: false
                    }
                });
            }
        }
    } catch (e) {
        console.error('managePolicyLifecycle error:', e);
    }
}

async function createElection(municipality, electionType = 'COUNCIL', targetRank = 1) {
    try {
        const now = new Date();
        const votingStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Campaigning for 1 day
        const votingEnd = new Date(votingStart.getTime() + 24 * 60 * 60 * 1000); // Voting for 1 day

        const election = await prisma.election.create({
            data: {
                municipalityId: municipality.id,
                electionType: electionType,
                status: 'CAMPAIGNING',
                campaignStart: now,
                votingStart,
                votingEnd,
            }
        });

        // Add NPC candidates (2-3)
        const npcCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
        const usedNames = new Set();
        for (let i = 0; i < npcCount; i++) {
            let name;
            do { name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]; } while (usedNames.has(name));
            usedNames.add(name);
            const bio = NPC_BIOS[Math.floor(Math.random() * NPC_BIOS.length)];

            await prisma.candidate.create({
                data: {
                    electionId: election.id,
                    isNpc: true,
                    npcName: name,
                    npcBio: bio,
                }
            });
        }

        // Add real POLITICIAN players eligible for this rank
        const eligibleRank = targetRank - 1;
        const politicians = await prisma.user.findMany({
            where: {
                municipalityId: municipality.id,
                playerRole: 'POLITICIAN',
                politicalRank: eligibleRank,
            }
        });

        for (const pol of politicians) {
            await prisma.candidate.create({
                data: {
                    electionId: election.id,
                    userId: pol.id,
                    isNpc: false,
                }
            });
        }

        // Create campaign announcement event
        const totalCandidates = npcCount + politicians.length;
        await prisma.municipalEvent.create({
            data: {
                municipalityId: municipality.id,
                eventType: 'ELECTION',
                title: `📢 ${electionType} Election Announced in ${municipality.name}`,
                content: `A new ${electionType.toLowerCase()} election has begun! ${totalCandidates} candidates are vying for office. The campaign period runs until ${votingStart.toLocaleDateString()}, with voting open until ${votingEnd.toLocaleDateString()}.`,
            }
        });

        console.log(`[Election] Created ${electionType} election in ${municipality.name} with ${totalCandidates} candidates.`);
    } catch (e) {
        console.error(`Error creating election in ${municipality.name}:`, e);
    }
}

async function tallyElection(electionId, municipality, electionType = 'COUNCIL', targetRank = 1) {
    try {
        const election = await prisma.election.findUnique({
            where: { id: electionId },
            include: {
                candidates: {
                    orderBy: { voteCount: 'desc' },
                    include: { user: { select: { id: true, username: true } } }
                }
            }
        });

        if (!election || election.candidates.length === 0) return;

        const winner = election.candidates[0];
        const winnerName = winner.isNpc ? winner.npcName : winner.user?.username || 'Unknown';

        // Mark election completed
        await prisma.election.update({
            where: { id: electionId },
            data: { status: 'COMPLETED', winnerId: winner.userId || winner.id }
        });

        // If winner is a real player, promote them
        if (!winner.isNpc && winner.userId) {
            await prisma.user.update({
                where: { id: winner.userId },
                data: { politicalRank: targetRank }
            });
        }

        // Create results announcement
        const resultsText = election.candidates.map((c, i) => {
            const name = c.isNpc ? c.npcName : c.user?.username;
            return `${i + 1}. ${name} — ${c.voteCount} vote${c.voteCount !== 1 ? 's' : ''}`;
        }).join('\n');

        await prisma.municipalEvent.create({
            data: {
                municipalityId: municipality.id,
                eventType: 'ELECTION',
                title: `🏆 ${winnerName} Wins ${municipality.name} ${electionType} Election!`,
                content: `The results are in. ${winnerName} has won the ${electionType.toLowerCase()} election in ${municipality.name}.\n\nFinal Results:\n${resultsText}`,
            }
        });

        console.log(`[Election] ${municipality.name} — ${winnerName} wins with ${winner.voteCount} votes.`);
    } catch (e) {
        console.error('Error tallying election:', e);
    }
}


console.log("Starting OxNet Background Engine...");

// Initial kicks
recordPriceHistories();
recordSectorIndices();
dynamicNewsScheduler(); // Replaces old scheduledPublishNewsStory
simulateTradeImpacts();
applySinusoidalMovements();
manageElections(); // Manage municipality elections
manageFederalElections(); // Manage federal elections

// Kick off daily midnight backup cron
initBackupWorker();

// Kick off goal auction processing
initGoalWorker();

// Scheduled intervals
setInterval(recordPriceHistories, FIVE_MINS);
setInterval(recordSectorIndices, FIFTEEN_MINS);
setInterval(dynamicNewsScheduler, ONE_MIN);            // Dynamic: checks mode and timing each minute
setInterval(simulateTradeImpacts, THIRTY_SECONDS);
setInterval(applySinusoidalMovements, ONE_MIN);
setInterval(checkMarginCalls, THIRTY_SECONDS);
setInterval(checkConditionalOrders, ONE_MIN);
setInterval(executeLimitOrders, THIRTY_SECONDS);
setInterval(scheduledProcessCeoDecisions, TWO_MINS);   // Mode-aware CEO decision processing
setInterval(checkHedgeFundPerformance, FIVE_MINS);
setInterval(refreshAIContext, THIRTY_MINS);
setInterval(runProductionCycle, PRODUCTION_CYCLE_INTERVAL);
setInterval(runLabourMarketUpdate, PRODUCTION_CYCLE_INTERVAL);
setInterval(runMunicipalUpdate, PRODUCTION_CYCLE_INTERVAL);
setInterval(managePolicyLifecycle, THIRTY_MINS);
setInterval(releaseMondayQueue, ONE_MIN);               // Check for Monday 8AM queue release
setInterval(manageElections, THIRTY_MINS);            // Manage municipality elections (every 30m)
setInterval(manageFederalElections, THIRTY_MINS);     // Manage federal elections (every 30m)
setInterval(manageFederalPolicies, FIVE_MINS);         // Manage federal political layer

async function manageFederalPolicies() {
    console.log(`[${new Date().toISOString()}] Managing Federal Politics...`);
    try {
        // 1. NPC Voting Simulation
        await simulateFederalNPCVoting();

        // 2. Tally Expired Proposals
        const now = new Date();
        const expired = await prisma.policyProposal.findMany({
            where: {
                status: 'VOTING',
                endsAt: { lte: now }
            },
            include: {
                votes: true
            }
        });

        for (const p of expired) {
            const votesFor = p.votes.filter(v => v.support).length;
            const votesAgainst = p.votes.length - votesFor;

            const passed = votesFor > votesAgainst;
            const newStatus = passed ? 'PASSED' : 'FAILED';

            await prisma.policyProposal.update({
                where: { id: p.id },
                data: { status: newStatus }
            });

            console.log(`[Policy] ${p.title} - ${newStatus} (${votesFor} FOR, ${votesAgainst} AGAINST)`);

            // Apply economic effects if passed
            if (passed) {
                // Future expansion: Apply effects to marketMath or sector modifiers
                // For now, we'll log it and let the AI News generator handle the narrative impact
                await prisma.newsStory.create({
                    data: {
                        headline: `🏛️ FED PASSES: ${p.title}`,
                        context: `The federal legislature has passed the ${p.title} policy. ${p.description}. Its effects on the market are expected immediately.`,
                        targetSector: p.targetSector || 'ECONOMY',
                        targetSpecialty: 'LEGISLATION',
                        impactScope: p.targetSector ? 'SECTOR' : 'GLOBAL',
                        direction: p.effectValue >= 0 ? 'UP' : 'DOWN',
                        intensityWeight: Math.round(Math.abs(p.effectValue) * 10),
                        competitorInversion: false
                    }
                });
            }
        }
    } catch (e) {
        console.error('manageFederalPolicies error:', e);
    }
}

async function simulateFederalNPCVoting() {
    try {
        const activeProposals = await prisma.policyProposal.findMany({ where: { status: 'VOTING' } });
        const npcs = await prisma.user.findMany({ where: { isNPC: true, politicalRank: { gte: 2 } } });

        for (const p of activeProposals) {
            for (const npc of npcs) {
                // Check if already voted
                const existing = await prisma.policyVote.findFirst({
                    where: { voterId: npc.id, proposalId: p.id }
                });
                if (existing) continue;

                // Simple personality-based logic for now
                // Future: Use LLM for "Political Strategy" decisions
                let support = Math.random() > 0.4; // Default bias towards action

                // If philosophy matches title keywords, boost support
                if (npc.philosophy && p.title) {
                    const phil = npc.philosophy.toLowerCase();
                    const title = p.title.toLowerCase();
                    if (phil.includes('expansion') && title.includes('relief')) support = true;
                    if (phil.includes('regulation') && title.includes('ban')) support = true;
                }

                await prisma.policyVote.create({
                    data: {
                        voterId: npc.id,
                        proposalId: p.id,
                        support
                    }
                });
                console.log(`[NPC Vote] ${npc.username} voted ${support ? 'FOR' : 'AGAINST'} ${p.title}`);
            }
        }
    } catch (e) {
        console.error('simulateFederalNPCVoting error:', e);
    }
}

// Initial production cycle kick
runProductionCycle();
runLabourMarketUpdate();
runMunicipalUpdate();
managePolicyLifecycle();
