import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHS_PATH = path.join(__dirname, '../../data/news_archs.json');

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

export async function generateDailyNews() {
    console.log(`[${new Date().toISOString()}] Starting daily news generation (8 stories)...`);
    
    let archData = { activeArchs: [] };
    try {
        if (fs.existsSync(ARCHS_PATH)) {
            archData = JSON.parse(fs.readFileSync(ARCHS_PATH, 'utf8'));
        }
    } catch (e) {
        console.error("Error reading news_archs.json:", e);
    }

    const allAssets = await prisma.asset.findMany({ where: { symbol: { not: 'DELTA' } } });
    const allNpcs = await prisma.nPC.findMany();

    const dailyStories = [];
    const newArchs = [];

    // 1. Headline Story (5-day arch)
    let headlineArch = archData.activeArchs.find(a => a.type === 'HEADLINE');
    if (headlineArch) {
        headlineArch.currentDay++;
        if (headlineArch.currentDay > headlineArch.duration) {
            headlineArch = null; // Arch finished
        }
    }

    if (!headlineArch) {
        const target = allAssets[Math.floor(Math.random() * allAssets.length)];
        headlineArch = {
            id: `arch_${Date.now()}_H`,
            type: 'HEADLINE',
            targetAssetId: target.id,
            symbol: target.symbol,
            sector: target.sector,
            niche: target.niche,
            direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
            intensity: 5,
            duration: 5,
            currentDay: 1,
            history: []
        };
    }
    const headlineStory = await generateStoryForArch(headlineArch, allNpcs);
    dailyStories.push(headlineStory);
    headlineArch.history.push(headlineStory.headline);
    newArchs.push(headlineArch);

    // 2. Two Multiday Stories (3-day arch)
    const multidayArchs = archData.activeArchs.filter(a => a.type === 'MULTIDAY');
    // Progress existing ones
    for (const arch of multidayArchs) {
        arch.currentDay++;
        if (arch.currentDay <= arch.duration) {
            const story = await generateStoryForArch(arch, allNpcs);
            dailyStories.push(story);
            arch.history.push(story.headline);
            newArchs.push(arch);
        }
    }
    // Fill gaps if needed
    while (newArchs.filter(a => a.type === 'MULTIDAY').length < 2) {
        const target = allAssets[Math.floor(Math.random() * allAssets.length)];
        const newArch = {
            id: `arch_${Date.now()}_M_${newArchs.length}`,
            type: 'MULTIDAY',
            targetAssetId: target.id,
            symbol: target.symbol,
            sector: target.sector,
            niche: target.niche,
            direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
            intensity: Math.floor(Math.random() * 2) + 3, // 3-4
            duration: 3,
            currentDay: 1,
            history: []
        };
        const story = await generateStoryForArch(newArch, allNpcs);
        dailyStories.push(story);
        newArch.history.push(story.headline);
        newArchs.push(newArch);
    }

    // 3. Five Single-Day Stories
    for (let i = 0; i < 5; i++) {
        const target = allAssets[Math.floor(Math.random() * allAssets.length)];
        const story = await generateSingleDayStory(target, allNpcs);
        dailyStories.push(story);
    }

    // Save archs back
    fs.writeFileSync(ARCHS_PATH, JSON.stringify({ activeArchs: newArchs }, null, 2));

    // Publish all simultaneously to DB
    // Note: We publish them with publishedAt set to today at 8:00 AM EST
    const publishTime = getToday8AM();
    
    for (const storyData of dailyStories) {
        await prisma.newsStory.create({
            data: {
                ...storyData,
                publishedAt: publishTime
            }
        });
    }

    console.log(`[${new Date().toISOString()}] Successfully published 8 stories for ${publishTime.toISOString()}`);
}

async function generateStoryForArch(arch, npcs) {
    const defaultNPC = { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies" };
    const npc = npcs.length > 0 ? npcs[Math.floor(Math.random() * npcs.length)] : defaultNPC;
    const npcIdentifier = `${npc.name}, ${npc.title} at ${npc.institution}`;

    const prompt = `
# OxNet News Engine Rules
You are the narrative engine tracking a multi-day story arch.
Target: ${arch.symbol} (${arch.sector})
Direction: ${arch.direction}
Intensity: ${arch.intensity}
Arch Progress: Day ${arch.currentDay} of ${arch.duration}
Previous Headlines in this Arch: ${arch.history.join(' -> ') || 'None'}

NPC Involved: ${npcIdentifier}

Write a breaking news story that continues this narrative. 
CRITICAL: 
- 8th-grade reading level.
- 5-10 sentences.
- Connect logically to previous events.
- Output ONLY pure JSON.

Schema:
{
  "Headline": "...",
  "Story": "...",
  "Summary": "...",
  "Direction": "${arch.direction}",
  "Intensity_Weight": ${arch.intensity},
  "Competitor_Inversion": ${Math.random() > 0.7},
  "Tags": ["${arch.symbol}", "${arch.sector}", "ArchDay${arch.currentDay}"]
}
`;

    return callLLM(prompt, arch.symbol, arch.sector, arch.niche, npc.name);
}

async function generateSingleDayStory(asset, npcs) {
    const defaultNPC = { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies" };
    const npc = npcs.length > 0 ? npcs[Math.floor(Math.random() * npcs.length)] : defaultNPC;
    const npcIdentifier = `${npc.name}, ${npc.title} at ${npc.institution}`;
    const direction = Math.random() > 0.5 ? 'UP' : 'DOWN';
    const intensity = Math.floor(Math.random() * 3) + 1;

    const prompt = `
# OxNet News Engine Rules
You are writing a single-day news story.
Target: ${asset.symbol} (${asset.sector})
Direction: ${direction}
Intensity: ${intensity}

NPC Involved: ${npcIdentifier}

Schema:
{
  "Headline": "...",
  "Story": "...",
  "Summary": "...",
  "Direction": "${direction}",
  "Intensity_Weight": ${intensity},
  "Competitor_Inversion": ${Math.random() > 0.7},
  "Tags": ["${asset.symbol}", "${asset.sector}"]
}
`;

    return callLLM(prompt, asset.symbol, asset.sector, asset.niche, npc.name);
}

async function callLLM(prompt, symbol, sector, niche, npcName) {
    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            const aiData = JSON.parse(cleaned);
            
            return {
                headline: aiData.Headline,
                context: aiData.Story,
                targetSector: sector,
                targetSpecialty: niche,
                impactScope: "SPECIALTY",
                direction: aiData.Direction,
                intensityWeight: aiData.Intensity_Weight,
                competitorInversion: aiData.Competitor_Inversion,
                summary: aiData.Summary,
                npcInvolved: npcName,
                tags: JSON.stringify(aiData.Tags)
            };
        }
    } catch (e) {
        console.error("LLM call failed, using fallback:", e.message);
    }

    return {
        headline: `Update on ${symbol}`,
        context: `The situation regarding ${symbol} in the ${sector} sector continues to evolve. Analysts are monitoring the impact on ${niche}.`,
        targetSector: sector,
        targetSpecialty: niche,
        impactScope: "SPECIALTY",
        direction: "UP",
        intensityWeight: 1,
        competitorInversion: false,
        summary: `Market update for ${symbol}`,
        npcInvolved: npcName,
        tags: JSON.stringify([symbol, sector])
    };
}

function getToday8AM() {
    const now = new Date();
    // Use America/New_York
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    estDate.setHours(8, 0, 0, 0);
    // If it's already past 8am, we are publishing for "today", if before, also today.
    // The scheduler will call this once a day.
    return estDate;
}
