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
// LM Studio / Ollama compatible endpoint
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b'; // Optional, some local servers ignore it

// Group by sector
const sectorsMap = {};
assets.forEach(asset => {
    if (!sectorsMap[asset.sector]) {
        sectorsMap[asset.sector] = [];
    }
    sectorsMap[asset.sector].push(asset.niche);
});

async function generateStoryWithAI(sector, niche, historyLines) {

    const prompt = `
${aiContextText}

**NEW STORY REQUEST**
Sector: "${sector}"
Niche: "${niche}"

Here are the most recent news events that occurred in this world. 
You MUST review them to maintain narrative consistency. If relevant, follow up directly on one of these events or mention how the previous event led to this one. Refer to them as historical canon.

Recent Historical News Events:
${historyLines}

Output strictly the JSON structure requested in your context rules.
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

        // Attempt to clean markdown if the AI includes it despite instructions
        const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        return parsed;

    } catch (e) {
        console.error(`[AI Generation Failed] ${e.message}. Using fallback.`);
        return null; // Signals main loop to use a fallback
    }
}

async function runGenerations() {
    const newsArray = [];

    // Fetch real history from the database to enforce narrative consistency
    console.log("Fetching historical news for context...");
    const dbHistory = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 20
    });

    // We format the history so the AI can easily digest it
    let historyLines = "No recent events recorded in history yet.";
    if (dbHistory.length > 0) {
        historyLines = dbHistory.map(item => `[${item.targetSector} - ${new Date(item.publishedAt).toLocaleDateString()}] ${item.headline}\nContent: ${item.context}`).join('\n\n');
    }

    for (const sector in sectorsMap) {
        const niches = sectorsMap[sector];

        // We will generate 3 stories per sector
        for (let i = 0; i < 3; i++) {
            const niche = niches[i % niches.length];

            console.log(`Generating story for ${sector} - ${niche}...`);
            let aiData = await generateStoryWithAI(sector, niche, historyLines);

            // Fallback to basic random if the AI fails or endpoint is not reachable
            if (!aiData) {
                const isUp = Math.random() > 0.5;
                aiData = {
                    Headline: `Breakthrough in ${niche}`,
                    Story: `Advances in ${niche} hold promise for the future. The company is poised to take advantage of these new developments, leading to a new era of growth.`,
                    Expected_Economic_Outcome: `This should increase profits long term and provide a stable outlook for the sector.`,
                    Direction: isUp ? "UP" : "DOWN",
                    Intensity_Weight: Math.floor(Math.random() * 5) + 1,
                    Competitor_Inversion: Math.random() > 0.7
                };
            }

            // Format to match old output schema requirement
            const formattedStory = {
                Headline: aiData.Headline,
                Context: `${aiData.Story}\n\n**Expected Economic Outcome**\n\n${aiData.Expected_Economic_Outcome}`,
                Target_Sector: sector,
                Target_Specialty: niche,
                Impact_Scope: Math.random() > 0.5 ? "SECTOR" : "SPECIALTY",
                Direction: aiData.Direction,
                Intensity_Weight: aiData.Intensity_Weight,
                Competitor_Inversion: aiData.Competitor_Inversion
            };

            newsArray.push(formattedStory);
        }
    }

    // Ensure exactly 250 items total by duplicating if necessary
    while (newsArray.length < 250) {
        const randomStory = newsArray[Math.floor(Math.random() * newsArray.length)];
        newsArray.push({ ...randomStory });
    }

    if (newsArray.length > 250) {
        newsArray.length = 250;
    }

    fs.writeFileSync('news_output.json', JSON.stringify(newsArray, null, 2));
    console.log(`Generated ${newsArray.length} stories and saved to news_output.json`);
}

runGenerations().finally(() => prisma.$disconnect());
