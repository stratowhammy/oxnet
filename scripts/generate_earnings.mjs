import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

async function generateEarnings() {
    console.log("Cleaning up previous interrupted generation...");
    // Delete any news story containing the specific Q3 Earnings tag to ensure we don't duplicate
    const oldStories = await prisma.newsStory.findMany();
    let deleted = 0;
    for (const story of oldStories) {
        if (story.tags && story.tags.includes("Q3 Earnings")) {
            await prisma.newsStory.delete({ where: { id: story.id } });
            deleted++;
        }
    }
    console.log(`Deleted ${deleted} previous Q3 Earnings stories.`);

    console.log("\nStarting Mass Quarterly Earnings Generation explicitly for STOCK...");

    const allStocks = await prisma.asset.findMany({
        where: { type: 'STOCK' },
        select: { id: true, symbol: true, name: true, sector: true, niche: true }
    });

    console.log(`Found ${allStocks.length} valid companies.`);

    const newsOutlets = [
        { name: "Global Markets Daily", stance: "Centrist / Establishment / Pro-Corporate" },
        { name: "The Zenith Observer", stance: "Academic / Analytical / Data-Driven" },
        { name: "Vanguard News", stance: "Progressive / Critical / Institutional" }
    ];

    const reporters = [
        "Sarah Jenkins", "David Chen", "Rex Sterling", "Omar Al-Fayed", "Noah Miller", "Ava Davis"
    ];

    let successCount = 0;

    for (const asset of allStocks) {
        console.log(`Drafting Q3 Earnings for ${asset.name} (${asset.symbol})...`);

        const programmaticDirection = Math.random() > 0.5 ? "UP" : "DOWN";
        const beatOrMiss = programmaticDirection === "UP" ? "beat expectations" : "missed expectations";
        const programmaticIntensity = Math.floor(Math.random() * 4) + 2;

        const selectedOutlet = newsOutlets[Math.floor(Math.random() * newsOutlets.length)];
        const selectedReporter = reporters[Math.floor(Math.random() * reporters.length)];

        const rulesAndIdentity = `
# OxNet News Engine Rules
You are an objective financial reporter for a global economic simulation. Output purely functional JSON to manipulate the fictional economy.
1. NEVER reference real-world companies, individuals, or places (e.g., Apple, Elon Musk, Jerome Powell, USA).
2. ONLY reference the requested company.
3. Tone: Professional, objective financial journalism (like Bloomberg). However, you MUST write at a 6th to 8th-grade reading level.
   - Use short sentences.
   - Use simple, common vocabulary. Avoid overly complex jargon.
   - Keep paragraphs brief and clear.
4. Format: STRICTLY JSON conforming to the requested schema. No markdown wrapping.
`;

        const prompt = `
${rulesAndIdentity}

**NEW STORY REQUEST: QUARTERLY EARNINGS REPORT**
Target Company: "${asset.name}" (${asset.symbol})
Sector: "${asset.sector}"
Niche: "${asset.niche}"
Overall Outcome: The company ${beatOrMiss} for Q3.

Write a breaking news report about their Q3 Earnings and forward guidance for Q4.
CRITICAL TARGET LITERACY: 6th to 8th grade. Explain the business reason simply.
- Example GOOD sentence: "${asset.name} reported strong earnings today. Sales of their new product grew fast. The CEO said the next quarter looks great."
- Example BAD sentence: "Following a macroeconomic paradigm shift resulting in unprecedented capitalization across the sector..."

CRITICAL: Include exactly one Markdown link naturally inside the Story referencing the company, e.g., \`[${asset.name}](/?search=${asset.symbol})\`.

You MUST respond ONLY with a raw JSON object matching exactly this schema:
{
  "Headline": "String (Short, punchy earnings headline)",
  "Story": "String (4-6 simple sentences. Explain if they made money or not. Explain WHY simply. Give their 'forward guidance' for Q4. MUST include exactly one Markdown link.)",
  "Summary": "String (Exactly 1 short, simple sentence summarizing the report.)",
  "Expected_Economic_Outcome": "String (Exactly 1 or 2 lines explaining what happens next simply. Use could/should language.)",
  "Direction": "${programmaticDirection}",
  "Intensity_Weight": ${programmaticIntensity},
  "Competitor_Inversion": true/false,
  "Tags": ["Array", "Of", "String", "Tags"] (e.g., ["Q3 Earnings", "${asset.sector}", "${asset.symbol}"])
}
`;

        const aiData = {
            Headline: `${asset.name} Q3 Earnings Report`,
            Story: `[${asset.name}](/?search=${asset.symbol}) released its Q3 earnings today. The company ${beatOrMiss} for the quarter. Sales in their main business were steady. Leaders told investors that Q4 looks promising. They plan to cut costs to help profits grow.`,
            Summary: `${asset.name} reported Q3 results and gave a positive outlook for Q4.`,
            Expected_Economic_Outcome: `This news should impact the stock and its related sector.`,
            Direction: programmaticDirection,
            Intensity_Weight: programmaticIntensity,
            Competitor_Inversion: false,
            Tags: ["Q3 Earnings", asset.sector, asset.symbol]
        };

        const direction = (String(aiData.Direction).toUpperCase() === 'DOWN') ? 'DOWN' : 'UP';
        const intensity = Number(aiData.Intensity_Weight) || programmaticIntensity;
        const inversion = (aiData.Competitor_Inversion === true || String(aiData.Competitor_Inversion).toLowerCase() === 'true');

        try {
            await prisma.newsStory.create({
                data: {
                    headline: aiData.Headline,
                    context: aiData.Story,
                    targetSector: asset.sector,
                    targetSpecialty: asset.niche,
                    impactScope: "SECTOR",
                    direction: direction,
                    intensityWeight: intensity,
                    competitorInversion: inversion,
                    summary: aiData.Summary || null,
                    npcInvolved: null,
                    tags: JSON.stringify(aiData.Tags),
                    outlet: selectedOutlet.name,
                    reporter: selectedReporter
                }
            });
            successCount++;
        } catch (dbErr) {
            console.error(`Failed to save to DB for ${asset.symbol}:`, dbErr.message);
        }
    }

    console.log(`\nGeneration Complete! Successfully published ${successCount} Q3 Earnings Reports.`);
}

generateEarnings().catch(console.error).finally(() => prisma.$disconnect());
