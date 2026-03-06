const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function stats() {
    const assetCount = await prisma.asset.count();
    const newsCount = await prisma.newsStory.count();
    const sampleNews = await prisma.newsStory.findFirst();
    const earningsStories = await prisma.newsStory.findMany({
        where: { headline: { contains: 'Earnings' } },
        take: 5
    });

    console.log(JSON.stringify({
        assetCount,
        newsCount,
        sampleNewsSize: sampleNews ? JSON.stringify(sampleNews).length : 0,
        avgEarningsSize: earningsStories.length > 0 ? (earningsStories.reduce((acc, s) => acc + JSON.stringify(s).length, 0) / earningsStories.length) : 0
    }, null, 2));
}
stats().catch(err => {
    console.error(err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
