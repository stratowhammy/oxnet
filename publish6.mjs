import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

const aiContextPath = path.join(process.cwd(), 'ai_news_context.md');
const aiContextText = fs.existsSync(aiContextPath) ? fs.readFileSync(aiContextPath, 'utf-8') : '';

async function publishOne() {
    const allAssets = await prisma.asset.findMany({ where: { symbol: { not: 'DELTA' } } });
    const targetAsset = allAssets[Math.floor(Math.random() * allAssets.length)];
    const { sector, niche, name: companyName } = targetAsset;

    const dbHistory = await prisma.newsStory.findMany({ orderBy: { publishedAt: 'desc' }, take: 3 });
    let historyLines = "No recent events recorded.";
    if (dbHistory.length > 0) {
        historyLines = dbHistory.map(item => `[${item.targetSector}] ${item.headline}\n${item.context}`).join('\n\n');
    }

    const prompt = `
${aiContextText}

**NEW STORY REQUEST**
Target Listed Company: "${companyName}"
Sector: "${sector}"
Niche: "${niche}"

Recent Historical News Events:
${historyLines}

CRITICAL INSTRUCTION: Write this story about '${companyName}'. Output strictly the JSON structure requested in your context rules.
`;

    let aiData;
    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: 'system', content: 'You are a highly capable AI trained to output pure JSON data only. All generated text must be written at an 8th grade reading level — use simple, clear language that a 13-year-old could understand. Avoid jargon, complex sentence structures, and advanced vocabulary.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            aiData = JSON.parse(cleaned);
        }
    } catch (e) {
        console.error('LLM failed:', e.message);
    }

    if (!aiData) {
        aiData = {
            Headline: `Breakthrough in ${niche}`,
            Story: `Big changes are happening in the ${niche} space. ${companyName} is making moves that could change things for everyone in the industry.`,
            Expected_Economic_Outcome: `This could be good or bad for the sector — only time will tell.`,
            Direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
            Intensity_Weight: Math.floor(Math.random() * 5) + 1,
            Competitor_Inversion: Math.random() > 0.7
        };
    }

    const story = await prisma.newsStory.create({
        data: {
            headline: aiData.Headline || 'Market Update',
            context: `${aiData.Story}\n\n**Expected Economic Outcome**\n\n${aiData.Expected_Economic_Outcome}`,
            targetSector: sector,
            targetSpecialty: niche,
            impactScope: Math.random() > 0.5 ? 'SECTOR' : 'SPECIALTY',
            direction: aiData.Direction || 'UP',
            intensityWeight: aiData.Intensity_Weight || 1,
            competitorInversion: aiData.Competitor_Inversion || false,
        }
    });

    console.log(`✓ Published: "${story.headline}" [${sector}/${niche}]`);
}

(async () => {
    for (let i = 1; i <= 6; i++) {
        console.log(`\nGenerating story ${i}/6...`);
        await publishOne();
    }
    console.log('\nAll 6 stories published!');
    await prisma.$disconnect();
    process.exit(0);
})();
