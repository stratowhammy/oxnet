import { PrismaClient } from '@prisma/client';
import { publishNewsStory } from './src/engine.js';

const prisma = new PrismaClient();

async function main() {
    console.log("Flushing old news stories...");
    await prisma.newsStory.deleteMany();
    console.log("Old news flushed.");

    console.log("Generating 6 new compliant stories...");
    for (let i = 0; i < 6; i++) {
        console.log(`\\n--- Publishing story ${i + 1} / 6 ---`);
        await publishNewsStory();

        // Wait 3 seconds between LLM hits to avoid slamming the local api
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log("\\nAll stories generated successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
