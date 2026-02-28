import { PrismaClient } from '@prisma/client';
import '../src/engine.js'; // fixed import

const prisma = new PrismaClient();

console.log("Starting OxNet Backend from engine.js import...");
setTimeout(async () => {
    console.log("Checking DB for latest news story...");
    const stories = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 1
    });
    if (stories.length > 0) {
        console.log("\n--- LATEST STORY ---");
        console.log("Headline:", stories[0].headline);
        console.log("Outlet:", stories[0].outlet);
        console.log("Reporter:", stories[0].reporter);
        console.log("Direction:", stories[0].direction);
        console.log("Content Preview:", stories[0].context.substring(0, 150) + '...');
    }
    process.exit(0);
}, 15000);
