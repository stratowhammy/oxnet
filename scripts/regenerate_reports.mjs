import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function generateReport(asset, retries = 3) {
    const beatOrMiss = Math.random() > 0.5 ? "beat expectations" : "missed expectations";
    const programmaticDirection = beatOrMiss === "beat expectations" ? "UP" : "DOWN";
    const programmaticIntensity = Math.floor(Math.random() * 4) + 2; // 2-5

    const prompt = `
# OxNet News Engine Rules
You are the lead narrative storyteller for a global economic simulation. Output purely functional JSON.
1. NEVER reference real-world companies.
2. ONLY reference the requested company.
3. Tone: Business friendly and engaging for a 12th grader, but vocabulary MUST be kept strictly to an 8th-grade reading level.
4. Format: STRICTLY JSON conforming to the requested schema. No markdown wrapping.

**NEW STORY REQUEST: LONG-FORM QUARTERLY REPORT**
Target Company: "${asset.name}" (${asset.symbol})
Sector: "${asset.sector}"
Specialty: "${asset.niche}"
Company Description: "${asset.description}"
Overall Outcome: The company ${beatOrMiss} for Q3/Q4.

CRITICAL INSTRUCTIONS: 
- Your report MUST be approximately 300 words long. Do not write a short summary.
- This is a creative world-building exercise. You MUST detail exactly WHO, WHAT, WHEN, WHERE, HOW, and WHY the company ${beatOrMiss}, using their specific products, services, and fake executive personalities. Create a rich tapestry of narrative connecting the company to the world.
- You MUST provide a specific, fake dollar figure for their "Projected Future Earnings" next quarter (e.g. "$45.2 Million").
- Asses a "Noteworthy_Score" from 1 to 100 on how shocking or market-moving this specific narrative is.
- Include exactly one Markdown link naturally inside the Story, e.g., \`[${asset.name}](/?search=${asset.symbol})\`.

You MUST respond ONLY with a raw JSON object matching exactly this schema:
{
  "Headline": "String (Headline)",
  "Story": "String (~300 words. Rich world-building narrative of exactly WHO, WHAT, WHEN, WHERE, HOW, and WHY.)",
  "Summary": "String (1 short sentence summary)",
  "Expected_Economic_Outcome": "String (1 line explaining what happens next simply)",
  "Projected_Future_Earnings": "String (Dollar figure forecast for next Quarter)",
  "Direction": "${programmaticDirection}",
  "Intensity_Weight": ${programmaticIntensity},
  "Competitor_Inversion": false,
  "Noteworthy_Score": Number (1-100),
  "Tags": ["Q3 Earnings", "${asset.sector}", "${asset.symbol}"]
}
`;

    for (let i = 0; i < retries; i++) {
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
                }),
                signal: AbortSignal.timeout(300000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices && data.choices.length > 0) {
                    let content = data.choices[0].message.content.trim();
                    // Strip <think>...</think> blocks if present
                    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                    const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                    return JSON.parse(cleaned);
                }
            }
        } catch (e) {
            console.error(`   [Retry ${i + 1}/${retries}] Attempt failed for ${asset.symbol}: ${e.message}`);
            if (i < retries - 1) await sleep(2000);
        }
    }
    return null;
}

async function bulkRegeneration() {
    console.log("Starting Bulk Quarterly Report Regeneration...");

    // 1. Fetch all stocks
    const stocks = await prisma.asset.findMany({
        where: { type: 'STOCK' }
    });
    console.log(`Found ${stocks.length} stocks to process.`);

    const newsOutlets = ["Global Markets Daily", "The Zenith Observer", "Vanguard News"];
    const reporters = ["Sarah Jenkins", "David Chen", "Rex Sterling"];

    // 3. Process each stock sequentially
    for (let i = 0; i < stocks.length; i++) {
        const asset = stocks[i];

        // Check if report already exists using tags and symbol
        const existing = await prisma.newsStory.findFirst({
            where: {
                isEarningsReport: true,
                tags: { contains: asset.symbol }
            }
        });

        if (existing) {
            console.log(`[${i + 1}/${stocks.length}] Skipping ${asset.symbol} (Already processed)`);
            continue;
        }

        console.log(`[${i + 1}/${stocks.length}] Regenerating for ${asset.name} (${asset.symbol})...`);

        const aiData = await generateReport(asset);
        if (aiData) {
            const projectionFigure = aiData.Projected_Future_Earnings || "$0.0 Million";
            const finalContext = `${aiData.Story}\n\n**Projected Future Earnings:** ${projectionFigure}`;
            const finalSummary = `${aiData.Summary} | Projected Next Q: ${projectionFigure}`;

            await prisma.newsStory.create({
                data: {
                    headline: aiData.Headline,
                    context: finalContext,
                    targetSector: asset.sector,
                    targetSpecialty: asset.niche,
                    impactScope: "SECTOR",
                    direction: (String(aiData.Direction).toUpperCase() === 'DOWN') ? 'DOWN' : 'UP',
                    intensityWeight: Number(aiData.Intensity_Weight) || 3,
                    competitorInversion: aiData.Competitor_Inversion || false,
                    summary: finalSummary,
                    tags: JSON.stringify(aiData.Tags),
                    outlet: newsOutlets[Math.floor(Math.random() * newsOutlets.length)],
                    reporter: reporters[Math.floor(Math.random() * reporters.length)],
                    isEarningsReport: true
                }
            });
            console.log(`   Success: Narrative created for ${asset.symbol}`);
        } else {
            console.log(`   Skipped: Failed to generate for ${asset.symbol} after retries.`);
        }

        // Small sleep between requests to let LLM server cool down
        await sleep(2000);
    }

    console.log("Bulk Regeneration Complete.");
}

bulkRegeneration()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
