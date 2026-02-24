import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawData = fs.readFileSync('assets.json', 'utf8');
const assets = JSON.parse(rawData);

// Read the new AI context file
let aiContextText = '';
try {
    aiContextText = fs.readFileSync('ai_news_context.md', 'utf8');
} catch (e) {
    console.error("Warning: ai_news_context.md not found.");
}

// Configuration for local AI
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

const sectorsMap = {};
assets.forEach(asset => {
    if (!sectorsMap[asset.sector]) {
        sectorsMap[asset.sector] = [];
    }
    sectorsMap[asset.sector].push(asset.niche);
});

const allSymbols = assets.filter(a => a.symbol !== 'DELTA').map(a => `${a.name} (${a.symbol})`);

async function generateStoryWithAI(sector, niche) {

    const asset = assets.find(a => a.niche === niche && a.sector === sector);
    const companyName = asset ? asset.name : "Unknown Company";
    const targetSymbol = asset ? asset.symbol : "UNK";

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

**NEW STORY REQUEST**
Generate a new breaking news story based on these specific parameters:
Target Company: "${companyName}" (${targetSymbol})
Sector: "${sector}"
Niche: "${niche}"
Direction: ${programmaticDirection}
Intensity Weight: ${programmaticIntensity} (1-5)
NPC to Quote/Cite: ${npcIdentifier} (Wait! You MUST use their full title and institution on first mention.)

CRITICAL: The subject must be "${companyName}". The impact must be logical based on their niche and the recent history. You MUST incorporate the NPC ${npcIdentifier} naturally. Use non-definite language (should/could/may) for economic outcomes. The tone MUST be Bloomberg/Yahoo Finance style and match the Direction and Intensity.

You MUST respond ONLY with a raw JSON object matching exactly the required schema. Ensure you include the 'Summary' and 'Expected_Economic_Outcome' fields.
In the 'Story' field, specifically refer to the NPC as "${npcIdentifier}" on first mention.
`;

    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: "system", content: "You are a highly capable AI trained to output pure JSON data only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error("No choices returned from LLM");
        }

        const content = data.choices[0].message.content.trim();
        const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        return JSON.parse(cleaned);

    } catch (e) {
        console.error(`[AI Generation Failed] ${e.message}. Using fallback.`);
        return null;
    }
}

async function runGenerations() {
    const newsArray = [];

    for (const sector of Object.keys(sectorsMap)) {
        const niches = sectorsMap[sector];

        for (let i = 0; i < 1; i++) {
            const niche = niches[i % niches.length];

            console.log(`Generating story for ${sector} - ${niche}...`);
            let aiData = await generateStoryWithAI(sector, niche);

            if (!aiData) {
                // Fallback will also use a random NPC for consistency
                const allNpcs = await prisma.nPC.findMany();
                const npcRecord = allNpcs.length > 0 ? allNpcs[Math.floor(Math.random() * allNpcs.length)] : { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies" };
                const npcIdentifier = `${npcRecord.name}, ${npcRecord.title} at ${npcRecord.institution}`;

                const isUp = Math.random() > 0.5;
                aiData = {
                    Headline: `Breakthrough in ${niche}`,
                    Story: `Advances in ${niche} hold promise for the future. Accoring to ${npcIdentifier}, this could lead to a new era of growth and should see rising demand for this stock and the sector as a whole.`,
                    Summary: `Advances in ${niche} are expected to reshape the sector according to ${npcIdentifier}.`,
                    Key_NPC_Involved: npcRecord.name,
                    Direction: isUp ? "UP" : "DOWN",
                    Intensity_Weight: Math.floor(Math.random() * 5) + 1,
                    Competitor_Inversion: Math.random() > 0.7
                };
            }

            const formattedStory = {
                Headline: aiData.Headline,
                Context: aiData.Story,
                Target_Sector: sector,
                Target_Specialty: niche,
                Impact_Scope: Math.random() > 0.5 ? "SECTOR" : "SPECIALTY",
                Direction: aiData.Direction,
                Intensity_Weight: aiData.Intensity_Weight,
                Competitor_Inversion: aiData.Competitor_Inversion,
                Summary: aiData.Summary,
                Key_NPC_Involved: aiData.Key_NPC_Involved || aiData.npcInvolved || aiData.Key_NPC_Involved
            };

            newsArray.push(formattedStory);
        }
    }

    if (newsArray.length > 30) {
        newsArray.length = 30;
    }

    fs.writeFileSync('news_output.json', JSON.stringify(newsArray, null, 2));
    console.log(`Generated ${newsArray.length} stories and saved to news_output.json`);
}

runGenerations().finally(() => prisma.$disconnect());
