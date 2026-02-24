import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const stories = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { headline: true, summary: true, npcInvolved: true, publishedAt: true }
    });
    console.log("RECENT STORIES VERIFICATION:");
    console.log(JSON.stringify(stories, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
