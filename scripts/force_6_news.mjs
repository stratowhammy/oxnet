import { publishNewsStory } from '../src/engine.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log("Clearing old news stories...");
    await prisma.newsStory.deleteMany({});

    console.log("Generating 6 new news stories...");
    for (let i = 0; i < 6; i++) {
        console.log(`Publishing story ${i + 1}/6...`);
        await publishNewsStory();
    }
    console.log("Done!");
    process.exit(0);
}

run();
