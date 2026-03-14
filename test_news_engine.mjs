import { generateDailyNews } from './src/lib/newsManager.js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHS_PATH = path.join(__dirname, 'data/news_archs.json');

async function test() {
    console.log("--- Testing News Engine Revision ---");

    // 1. Clear existing news and archs for clean test
    await prisma.newsStory.deleteMany();
    if (fs.existsSync(ARCHS_PATH)) {
        fs.writeFileSync(ARCHS_PATH, JSON.stringify({ activeArchs: [] }, null, 2));
    }

    console.log("Generating Day 1 News...");
    await generateDailyNews();

    const day1News = await prisma.newsStory.findMany();
    console.log(`Day 1: Generated ${day1News.length} stories.`);
    
    if (day1News.length !== 8) {
        throw new Error(`Expected 8 stories, got ${day1News.length}`);
    }

    const archsDay1 = JSON.parse(fs.readFileSync(ARCHS_PATH, 'utf8'));
    console.log("Active Archs Day 1:", archsDay1.activeArchs.length);

    console.log("Generating Day 2 News...");
    await generateDailyNews();

    const day2TotalNews = await prisma.newsStory.findMany();
    console.log(`Day 2 Total News: ${day2TotalNews.length}`);

    const archsDay2 = JSON.parse(fs.readFileSync(ARCHS_PATH, 'utf8'));
    console.log("Active Archs Day 2:", archsDay2.activeArchs.length);

    for (const arch of archsDay2.activeArchs) {
        console.log(`Arch ${arch.type} (${arch.symbol}): Current Day ${arch.currentDay}`);
        if (arch.currentDay !== 2) {
             console.error(`Warning: Arch ${arch.id} did not progress to day 2!`);
        }
    }

    console.log("--- Verification Complete ---");
}

test().catch(console.error).finally(() => prisma.$disconnect());
