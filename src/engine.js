import prisma from './lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBackupWorker } from './backupWorker.js';
import { initGoalWorker } from './goalWorker.js';
import { calculatePriceShift } from './lib/marketMath.js';
import { maintainMarketMakerOrders } from './lib/marketMaker.js';
import { AutomatedMarketMaker } from './lib/amm.js';

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Prune old price history: Keep only the most recent 500 bars per asset
    for (const a of assets) {
        const cutoff = await prisma.priceHistory.findFirst({
            where: { assetId: a.id },
            orderBy: { timestamp: 'desc' },
            skip: 500, // Target 500 bars for maximum efficiency
            select: { id: true, timestamp: true }
        });

        if (cutoff) {
            await prisma.priceHistory.deleteMany({
                where: {
                    assetId: a.id,
                    timestamp: { lte: cutoff.timestamp }
                }
            });
        }
    }

    // Reset memory tracker for the next 15-minute window
    currentCandles = {};

    console.log(`Recorded snapshot for ${assets.length} assets. Pruning complete.`);
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

    // Fetch a random NPC from the database
    const allNpcs = await prisma.nPC.findMany();
    const npcRecord = allNpcs.length > 0 ? allNpcs[Math.floor(Math.random() * allNpcs.length)] : { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies" };
    const selectedNpc = npcRecord.name;
    const npcIdentifier = `${npcRecord.name}, ${npcRecord.title} at ${npcRecord.institution}`;

    const programmaticDirection = Math.random() > 0.5 ? "UP" : "DOWN";
    const programmaticIntensity = Math.floor(Math.random() * 5) + 1;

    // Fetch Reporter's Brain Context
    const targetAssetHistory = await prisma.newsStory.findMany({
        where: { targetSpecialty: niche },
        orderBy: { publishedAt: 'desc' },
        take: 10
    });

    const sectorHistory = await prisma.newsStory.findMany({
        where: { targetSector: sector },
        orderBy: { publishedAt: 'desc' },
        take: 5
    });

    const npcHistory = await prisma.newsStory.findMany({
        where: { npcInvolved: selectedNpc },
        orderBy: { publishedAt: 'desc' },
        take: 5
    });

    const formatHistory = (hist) => hist.length > 0 ? hist.map(item => `[${item.publishedAt.toISOString().split('T')[0]}] ${item.headline} (${item.direction} ${item.intensityWeight}/5) - ${item.summary || item.context.substring(0, 100)}`).join('\n') : "No relevant history.";

    const targetAssetLines = formatHistory(targetAssetHistory);
    const sectorHistoryLines = formatHistory(sectorHistory);
    const npcHistoryLines = formatHistory(npcHistory);

    // Fetch details for the target asset and its sector colleagues
    const sectorColleagues = await prisma.asset.findMany({
        where: { sector: sector, symbol: { not: 'DELTA' } },
        select: { name: true, symbol: true, niche: true, description: true, basePrice: true, supplyPool: true, demandPool: true }
    });

    // Provide a lightweight list of ALL companies on the exchange to prevent hallucinations
    const allSymbols = allAssets.filter(a => a.symbol !== 'DELTA').map(a => `${a.name} (${a.symbol})`);

    const assetDetailsLines = sectorColleagues.map(a =>
        `- **${a.name}** (${a.symbol})\n  Niche: ${a.niche}\n  Price: Δ${a.basePrice.toFixed(2)} | Supply: ${a.supplyPool.toFixed(0)} | Demand: ${a.demandPool.toFixed(0)}\n  Description: ${a.description}`
    ).join('\n\n');

    const rulesAndIdentity = `
# OxNet News Engine Rules (CRITICAL)
You are the central intelligence behind the OxNet global economic simulation. Output purely functional JSON to manipulate the fictional economy.
1. NEVER reference real-world companies, individuals, or places (e.g., Apple, Elon Musk, Jerome Powell, USA).
2. ONLY reference companies from the provided "Valid Companies" list.
3. Use the provided "NPC Cast" for ANY human quotes or actions. DO NOT invent human names. Choose an appropriate NPC for the story topic.
4. Maintain a consistent fictional reality. Build on the provided global macroeconomic history.
5. Tone: Professional, objective financial journalism. Use non-definite words like "should", "could", "predicts", or "may" when discussing future economic outcomes.
6. Format: STRICTLY JSON conforming to the requested schema. No markdown wrapping.
`;

    const prompt = `
${rulesAndIdentity}

## Valid Companies on Exchange
${allSymbols.join(', ')}

## Reporter's Brain (Context for Narrative Coherence)
**Recent history for Asset's Niche:**
${targetAssetLines}

**Recent history for Sector:**
${sectorHistoryLines}

**Recent history involving NPC ${selectedNpc}:**
${npcHistoryLines}

## Target Company Context
${assetDetailsLines}

**NEW STORY REQUEST**
Generate a new breaking news story based on these specific parameters:
Target Company: "${companyName}" (${targetAsset.symbol})
Sector: "${sector}"
Niche: "${niche}"
Direction: ${programmaticDirection}
Intensity Weight: ${programmaticIntensity} (1-5)
NPC to Quote/Cite: ${npcIdentifier} (Wait! You MUST use their full title and institution on first mention.)

CRITICAL: The subject must be "${companyName}". The impact must be logical based on their niche and the recent history. You MUST incorporate the NPC ${npcIdentifier} naturally. Use non-definite language (should/could/may) for economic outcomes. The tone MUST be Bloomberg/Yahoo Finance style and match the Direction and Intensity.

You MUST respond ONLY with a raw JSON object matching exactly the required schema. Ensure you include the 'Summary' and 'Expected_Economic_Outcome' fields.
In the 'Story' field, specifically refer to the NPC as "${npcIdentifier}" on first mention.
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
        aiData = {
            Headline: `Breakthrough in ${niche}`,
            Story: `Advances in ${niche} hold promise for the future. The companies involved are poised to take advantage of these new developments. According to ${npcIdentifier}, this could lead to a new era of growth with rising demand for this stock and the sector as a whole.`,
            Summary: `Advances in ${niche} are expected to reshape the sector according to ${npcIdentifier}.`,
            Expected_Economic_Outcome: `This development could strengthen the market position of ${companyName}. Sector wide reverberations should be anticipated.`,
            Direction: programmaticDirection,
            Intensity_Weight: programmaticIntensity,
            Competitor_Inversion: Math.random() > 0.7
        };
    }

    // Harden AI outputs: Ensure correct types for Prisma
    const direction = (String(aiData.Direction || programmaticDirection).toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
    const intensity = Number(aiData.Intensity_Weight) || programmaticIntensity;
    const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

    try {
        const newStory = await prisma.newsStory.create({
            data: {
                headline: aiData.Headline || "Market Update",
                context: aiData.Story,
                targetSector: sector,
                targetSpecialty: niche,
                impactScope: Math.random() > 0.5 ? "SECTOR" : "SPECIALTY",
                direction: direction,
                intensityWeight: intensity,
                competitorInversion: inversion,
                summary: aiData.Summary || null,
                npcInvolved: selectedNpc
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
        const ageInMinutes = (Date.now() - new Date(story.publishedAt).getTime()) / (1000 * 60);

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

    // After all synthetic trades, trigger order resolution to handle any price crosses
}

async function executeSyntheticTrade(asset, userId, action, quantity) {
    if (asset.symbol === 'DELTA') return;

    const res = await AutomatedMarketMaker.executeTrade({
        userId,
        assetId: asset.id,
        type: action,
        quantity,
        isInternal: false // Allow cascades to trigger
    });

    if (res.success && res.executionPrice) {
        // Update local candle cache for this impact too
        const newPrice = res.executionPrice;
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
// 4. Margin Call Engine removed: now handled per-position in AutomatedMarketMaker
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

// (Redundant limit order execution and MM ticks removed. Handled by AutomatedMarketMaker core.)

async function initAllMarketMakerOrders() {
    try {
        const assets = await prisma.asset.findMany();
        for (const asset of assets) {
            await maintainMarketMakerOrders(asset.id);
        }
        console.log("Market Maker orders initialized.");
    } catch (e) {
        console.error("Failed to init MM orders:", e);
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
            const choiceText = decision.chosenOption === 'A' ? decision.choiceA
                : decision.chosenOption === 'B' ? decision.choiceB
                    : decision.choiceC;

            console.log(`[CEO News] Processing decision from ${decision.user.username} for ${decision.asset.symbol}...`);

            // Fetch a random NPC from the database
            const allNpcs = await prisma.nPC.findMany();
            const npcRecord = allNpcs.length > 0 ? allNpcs[Math.floor(Math.random() * allNpcs.length)] : { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies" };
            const selectedNpc = npcRecord.name;
            const npcIdentifier = `${npcRecord.name}, ${npcRecord.title} at ${npcRecord.institution}`;

            const programmaticDirection = Math.random() > 0.5 ? "UP" : "DOWN";
            const programmaticIntensity = Math.floor(Math.random() * 5) + 1;

            // Fetch Reporter's Brain Context
            const targetAssetHistory = await prisma.newsStory.findMany({
                where: { targetSpecialty: decision.asset.niche },
                orderBy: { publishedAt: 'desc' },
                take: 10
            });

            const sectorHistory = await prisma.newsStory.findMany({
                where: { targetSector: decision.asset.sector },
                orderBy: { publishedAt: 'desc' },
                take: 5
            });

            const npcHistory = await prisma.newsStory.findMany({
                where: { npcInvolved: selectedNpc },
                orderBy: { publishedAt: 'desc' },
                take: 5
            });

            const formatHistory = (hist) => hist.length > 0 ? hist.map(item => `[${item.publishedAt.toISOString().split('T')[0]}] ${item.headline} (${item.direction} ${item.intensityWeight}/5) - ${item.summary || item.context.substring(0, 100)}`).join('\n') : "No relevant history.";

            const targetAssetLines = formatHistory(targetAssetHistory);
            const sectorHistoryLines = formatHistory(sectorHistory);
            const npcHistoryLines = formatHistory(npcHistory);

            const colleagueInfo = await prisma.asset.findMany({
                where: { sector: decision.asset.sector, symbol: { not: 'DELTA' } },
                select: { name: true, symbol: true, niche: true, description: true }
            });

            const sectorContext = colleagueInfo.map(a => `- ${a.name} (${a.symbol}): ${a.niche}`).join('\n');

            const rulesAndIdentity = `
# OxNet News Engine Rules
You are the central intelligence behind the OxNet global economic simulation. Output purely functional JSON to manipulate the fictional economy.
- No real-world companies exist.
- Tone: Objective, urgent, data-centric Bloomberg/Yahoo Finance journalism. Use non-definite words like "should", "could", "predicts", or "may" when discussing economic outcomes.
- Format: Strictly JSON.
`;

            const prompt = `
${rulesAndIdentity}

## Sector Context: ${decision.asset.sector}
${sectorContext}

## Reporter's Brain (Context for Narrative Coherence)
**Recent history for Asset's Niche:**
${targetAssetLines}

**Recent history for Sector:**
${sectorHistoryLines}

**Recent history involving NPC ${selectedNpc}:**
${npcHistoryLines}

**CEO DECISION NEWS STORY**
The CEO of "${decision.asset.name}" (${decision.asset.symbol}) in the ${decision.asset.sector} sector (${decision.asset.niche}) was faced with this situation:

"${decision.question}"

They chose: "${choiceText}"

Write a breaking news story about this CEO decision and its market impact. 
Use 'Breaking,' 'Analysis,' or 'Alert' prefixes. Always cite specific fictional ticker symbols. Focus on 'the why'. Incorporate the NPC ${npcIdentifier} naturally with quotes.
Use non-definite language (could/should/predicts) for any talk of future economic outcomes.

You MUST respond ONLY with a raw JSON object matching exactly this schema:
{
  "Headline": "String (Short, punchy financial headline)",
  "Story": "String (5-10 sentences. MUST QUOTE or reference at least one person from the NPC Cast naturally. MUST end with a natural economic outlook sentence.)",
  "Summary": "String (Exactly 1 short sentence summarizing the article, asset, and NPC involved for the reporter's brain database.)",
  "Expected_Economic_Outcome": "String (Exactly 2 lines explaining the predicted economic outcome. Use could/should language.)",
  "Direction": "UP" or "DOWN",
  "Intensity_Weight": Number (1 to 5, 5 being market-shattering),
  "Competitor_Inversion": Boolean (true if competitors go down when this company goes up)
}
In the 'Story' field, refer to the NPC as "${npcIdentifier}" on first mention.
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
                aiData = {
                    Headline: `${decision.asset.name} CEO Makes Bold Strategic Move`,
                    Story: `The leadership at ${decision.asset.name} has made a significant strategic decision that analysts believe could reshape the company's position in the ${decision.asset.niche} market. The CEO's choice to ${choiceText.toLowerCase()} has drawn attention from institutional investors and competitors alike. ${npcIdentifier} noted that this could yield massive returns.`,
                    Summary: `The CEO of ${decision.asset.name} decided to ${choiceText.toLowerCase()}, according to ${npcIdentifier}.`,
                    Expected_Economic_Outcome: `Market observers anticipate this could have meaningful implications for the broader ${decision.asset.sector} sector in the coming sessions.`,
                    Direction: programmaticDirection,
                    Intensity_Weight: programmaticIntensity,
                    Competitor_Inversion: Math.random() > 0.6
                };
            }

            // Harden AI outputs: Ensure correct types for Prisma
            const direction = (String(aiData.Direction || programmaticDirection).toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
            const intensity = Number(aiData.Intensity_Weight) || programmaticIntensity;
            const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

            try {
                await prisma.newsStory.create({
                    data: {
                        headline: aiData.Headline || `${decision.asset.name}: CEO Decision Shakes Market`,
                        context: aiData.Story,
                        targetSector: decision.asset.sector,
                        targetSpecialty: decision.asset.niche,
                        impactScope: 'SPECIALTY',
                        direction: direction,
                        intensityWeight: intensity,
                        competitorInversion: inversion,
                        summary: aiData.Summary || null,
                        npcInvolved: selectedNpc
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

// 5 Minutes = 300,000 ms
const FIVE_MINS = 5 * 60 * 1000;
// 15 Minutes = 900,000 ms
const FIFTEEN_MINS = 15 * 60 * 1000;
// 30 Minutes = 1,800,000 ms 
const THIRTY_MINS = 30 * 60 * 1000;
// 1 Minute = 60,000 ms
const ONE_MIN = 60 * 1000;
// 2 Minutes for CEO decision checks
const TWO_MINS = 2 * 60 * 1000;
// 30 Seconds for simulation loop to feel "live"
const THIRTY_SECONDS = 30 * 1000;

// Helper: check if current time is within trading hours (8 AM - 4 PM EST, Mon-Fri)
function isWithinTradingHours() {
    const now = new Date();
    // Convert to EST (America/New_York)
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const est = new Date(estString);
    const day = est.getDay(); // 0=Sun, 6=Sat
    const hour = est.getHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}

// Scheduled wrapper for news: Checks every minute, publishes based on schedule mode
async function scheduledPublishNewsStory() {
    try {
        const setting = await prisma.globalSetting.findUnique({ where: { key: 'NEWS_SCHEDULE_MODE' } });
        const mode = setting?.value || 'MODE_24_7'; // Default to 24/7 if not set

        const lastStory = await prisma.newsStory.findFirst({
            orderBy: { publishedAt: 'desc' }
        });

        const now = new Date();
        const lastPublishedAt = lastStory ? lastStory.publishedAt : new Date(0);
        const minsSinceLastPublish = (now.getTime() - lastPublishedAt.getTime()) / (1000 * 60);

        if (mode === 'MODE_M_F_8_4') {
            if (!isWithinTradingHours()) {
                console.log(`[${now.toISOString()}] Outside trading hours (8AM-4PM EST Mon-Fri), skipping news publish.`);
                return;
            }
            if (minsSinceLastPublish < 10) {
                return; // Wait until 10 mins have passed
            }
        } else {
            // MODE_24_7
            if (minsSinceLastPublish < 30) {
                return; // Wait until 30 mins have passed
            }
        }

        console.log(`[${now.toISOString()}] Publishing news story. Mode: ${mode}`);
        // Reload context before publishing in case it was refreshed
        reloadAIContext();
        await publishNewsStory();
    } catch (e) {
        console.error("Error in scheduled news publish:", e);
    }
}

console.log("Starting OxNet Background Engine...");

// Initial kicks (news only if within trading hours)
recordPriceHistories();
recordSectorIndices();
scheduledPublishNewsStory();
simulateTradeImpacts();
applySinusoidalMovements();
initAllMarketMakerOrders();

// Kick off daily midnight backup cron
initBackupWorker();

// Kick off goal auction processing
initGoalWorker();

setInterval(recordPriceHistories, FIVE_MINS);
setInterval(recordSectorIndices, FIFTEEN_MINS); // Record sector indices every 15 minutes
setInterval(scheduledPublishNewsStory, ONE_MIN); // Checks schedule every 1 minute
setInterval(simulateTradeImpacts, THIRTY_SECONDS); // Run fake trades frequently
setInterval(applySinusoidalMovements, ONE_MIN); // Force push underlying market graph every 1 minute
// Liquidations check removed from interval, running per-trade now
setInterval(checkConditionalOrders, ONE_MIN); // Check TP/SL every 1 minute
// Limit order resolution and MM ticks are now handled automatically by AutomatedMarketMaker.executeTrade
setInterval(processCeoDecisions, TWO_MINS); // Check for CEO decisions to turn into news
setInterval(checkHedgeFundPerformance, FIVE_MINS); // Check HFM fund performance
setInterval(refreshAIContext, THIRTY_MINS); // Refresh AI context file every 30 minutes

