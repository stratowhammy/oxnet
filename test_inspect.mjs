import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const news = await prisma.newsStory.findMany();
    console.log(`Found ${news.length} stories.`);
    news.forEach((n, i) => {
        console.log(`\\n--- Story ${i + 1} ---`);
        console.log(`Headline: ${n.headline}`);
        console.log(`Summary: ${n.summary}`);
        console.log(`Tags: ${n.tags}`);
        console.log(`Has Link? ${n.context.includes('[') && n.context.includes('](')}`);
        console.log(`Directional keywords (should be low): ${/fall|plummet|skyrocket|surge|crash/i.test(n.context) ? 'YES' : 'NO'}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
