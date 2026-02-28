import { PrismaClient } from '@prisma/client';
import { publishNewsStory } from '../src/engine.js'; // Note we are importing publishNewsStory directly for the script to use

const prisma = new PrismaClient();

async function resetAndSeed() {
    console.log("== Initiating News Database Reset ==");
    try {
        const deleted = await prisma.newsStory.deleteMany({});
        console.log(`Successfully deleted ${deleted.count} old news stories.`);
    } catch (e) {
        console.error("Failed to delete old news stories:", e);
        process.exit(1);
    }

    console.log("\n== Generating 6 New Stories ==");
    let generated = 0;

    // We run it synchronously to avoid overwhelming the LLM and database simultaneously
    for (let i = 0; i < 6; i++) {
        console.log(`\nGenerating Story ${i + 1} of 6...`);
        try {
            await publishNewsStory();
            generated++;
            // Pause purely to space out OpenAI calls
            if (i < 5) {
                console.log("Waiting 3s before next call...");
                await new Promise(r => setTimeout(r, 3000));
            }
        } catch (e) {
            console.error(`Failed on story ${i + 1}:`, e);
        }
    }

    console.log(`\n== Finished! Generated ${generated}/6 stories. ==`);
    process.exit(0);
}

resetAndSeed();
