import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function calculateSentiment(closes) {
    if (closes.length < 2) return { trend: 'NEUTRAL', momentum: 0, volatility: 0 };

    // Simple momentum: % change first to last
    const oldest = closes[closes.length - 1];
    const newest = closes[0];
    const momentum = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;

    // Volatility: standard deviation of % changes
    const pctChanges = [];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > 0) {
            pctChanges.push(((closes[i - 1] - closes[i]) / closes[i]) * 100);
        }
    }
    const avgChange = pctChanges.length > 0 ? pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length : 0;
    const variance = pctChanges.length > 0 ? pctChanges.reduce((a, b) => a + (b - avgChange) ** 2, 0) / pctChanges.length : 0;
    const volatility = Math.sqrt(variance);

    const trend = momentum > 2 ? 'BULLISH' : momentum < -2 ? 'BEARISH' : 'NEUTRAL';

    return { trend, momentum: Math.round(momentum * 100) / 100, volatility: Math.round(volatility * 100) / 100 };
}

export async function generateAIContext() {
    console.log('[Context] Regenerating dynamic AI context file...');

    const assets = await prisma.asset.findMany({
        orderBy: { sector: 'asc' },
    });

    // Get CEOs
    const ceos = await prisma.user.findMany({
        where: { playerRole: 'CEO', managedAssetId: { not: null } },
        select: { username: true, managedAssetId: true },
    });
    const ceoMap = {};
    for (const ceo of ceos) {
        ceoMap[ceo.managedAssetId] = ceo.username;
    }

    // Get last 30 closes per asset
    const assetSentiments = {};
    const sectorCloses = {}; // sector -> array of all asset closes for sector-level sentiment

    for (const asset of assets) {
        const history = await prisma.priceHistory.findMany({
            where: { assetId: asset.id },
            orderBy: { timestamp: 'desc' },
            take: 30,
            select: { close: true },
        });

        const closes = history.map(h => h.close);
        assetSentiments[asset.id] = calculateSentiment(closes);

        if (!sectorCloses[asset.sector]) sectorCloses[asset.sector] = [];
        sectorCloses[asset.sector].push(...closes);
    }

    // Calculate sector-level sentiment
    const sectorSentiments = {};
    for (const [sector, closes] of Object.entries(sectorCloses)) {
        sectorSentiments[sector] = calculateSentiment(closes);
    }

    // Build the context file
    const sectors = [...new Set(assets.map(a => a.sector))].sort();

    let context = `# OxNet News Engine AI Context

You are the central intelligence behind the OxNet global economic simulation engine. Your job is to output purely functional JSON containing synthetic news headlines and stories that will directly manipulate fictional stock prices and the simulated global economy.

## CRITICAL CONSTRAINT
**No real-world companies exist in this universe.** The ONLY companies that exist are listed below. You MUST ONLY write stories about these companies, their sectors, and their niches. Never reference Apple, Google, Tesla, or any real company. This is a completely self-contained fictional economy.

## Tonal Rules
1. **Plausible Near-Future Reality**: Events should sound like actual financial news set 5-10 years in the future.
2. **Professional & Objective**: Write with the dry, impactful tone of Bloomberg or WSJ. Treat events as deeply serious.
3. **8th Grade Reading Level**: Use simple, clear language a 13-year-old could understand. Avoid jargon and complex vocabulary.
4. **Cohesive Narrative Continuity**: Thread new stories into any provided "Recent Historical News Events". Reference previous companies and events directly.

## Formatting Requirements
Generate purely JSON output:
\`\`\`json
{
  "Headline": "A catchy, market-moving news headline",
  "Story": "Exactly 5 lines of creative narrative describing the event.",
  "Expected_Economic_Outcome": "Exactly 2 lines explaining the predicted economic outcome.",
  "Direction": "UP" or "DOWN",
  "Intensity_Weight": integer 1-5,
  "Competitor_Inversion": boolean (true ~30% of the time)
}
\`\`\`
No markdown wrappers, no conversational filler. Just the JSON object.

---

## Complete Company Registry

`;

    for (const sector of sectors) {
        const sectorAssets = assets.filter(a => a.sector === sector);
        const ss = sectorSentiments[sector] || { trend: 'NEUTRAL', momentum: 0, volatility: 0 };

        context += `### ${sector} Sector\n`;
        context += `Sector Sentiment: ${ss.trend} (momentum: ${ss.momentum}%, volatility: ${ss.volatility}%)\n\n`;

        for (const asset of sectorAssets) {
            const sentiment = assetSentiments[asset.id] || { trend: 'NEUTRAL', momentum: 0, volatility: 0 };
            const ceoName = ceoMap[asset.id];

            context += `- **${asset.name}** (${asset.symbol})\n`;
            context += `  Niche: ${asset.niche}\n`;
            context += `  Description: ${asset.description}\n`;
            context += `  Price: Δ${asset.basePrice.toFixed(2)} | Supply: ${asset.supplyPool.toFixed(0)} | Demand: ${asset.demandPool.toFixed(0)}\n`;
            context += `  30-Close Sentiment: ${sentiment.trend} (${sentiment.momentum}% momentum, ${sentiment.volatility}% vol)\n`;
            if (ceoName) {
                context += `  CEO: ${ceoName} (active player)\n`;
            }
            context += '\n';
        }
    }

    context += `---\n\n**Total companies in this universe: ${assets.length}**\n`;
    context += `**Updated: ${new Date().toISOString()}**\n`;

    // Write to file
    const outputPath = path.join(__dirname, '../ai_news_context.md');
    fs.writeFileSync(outputPath, context, 'utf8');
    console.log(`[Context] Written ${assets.length} assets across ${sectors.length} sectors to ai_news_context.md`);

    await prisma.$disconnect();
}

// If run directly
if (process.argv[1] && process.argv[1].includes('generate_context')) {
    generateAIContext().then(() => process.exit(0));
}
