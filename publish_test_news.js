import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function publishNews() {
    console.log("Publishing 6 new news stories...");

    let newsOutput = [];
    try {
        newsOutput = JSON.parse(fs.readFileSync('news_output.json', 'utf8'));
    } catch (e) {
        console.error("Failed to load news_output.json.");
        process.exit(1);
    }

    const startIdx = Math.floor(Math.random() * (newsOutput.length - 6));
    const selection = newsOutput.slice(startIdx, startIdx + 6);

    for (const story of selection) {
        await prisma.newsStory.create({
            data: {
                headline: story.Headline,
                context: story.Context,
                targetSector: story.Target_Sector,
                targetSpecialty: story.Target_Specialty,
                impactScope: story.Impact_Scope,
                direction: story.Direction,
                intensityWeight: story.Intensity_Weight,
                competitorInversion: story.Competitor_Inversion
            }
        });
        console.log(`Published: ${story.Headline}`);
    }

    console.log("Done.");
}

publishNews().finally(() => prisma.$disconnect());
