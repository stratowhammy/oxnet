import { PrismaClient } from '@prisma/client';
import { publishNewsStory } from '../src/engine.js';

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up old news stories...");

    // Get all stories ordered by publishedAt desc
    const allStories = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' }
    });

    if (allStories.length > 24) {
        const storiesToDelete = allStories.slice(24);
        const idsToDelete = storiesToDelete.map(s => s.id);

        await prisma.newsStory.deleteMany({
            where: { id: { in: idsToDelete } }
        });

        console.log(`Deleted ${idsToDelete.length} old stories. Retained the 24 most recent.`);
    } else {
        console.log(`Only ${allStories.length} stories found. No cleanup needed.`);
    }

    console.log("Testing generation of a new story...");

    // Pick a random asset
    const asset = await prisma.asset.findFirst({
        where: { symbol: { not: 'DELTA' } }
    });

    if (asset) {
        await publishNewsStory(asset.sector, asset.niche, asset.name);
        console.log("publishNewsStory triggered successfully. Check database for result.");
    }

    console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
