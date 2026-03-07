import { PrismaClient } from '@prisma/client';
import { processEarningsCycles } from '../src/engine.js';

const prisma = new PrismaClient();

async function runTest() {
    console.log("Pushing all asset earnings to the future...");
    await prisma.asset.updateMany({
        data: { nextEarningsAt: new Date(Date.now() + 10000000) }
    });

    console.log("Forcing ONE asset (TEST) to be due for earnings...");
    const asset = await prisma.asset.findFirst({ where: { symbol: 'GENE' } });
    if (!asset) return;

    await prisma.asset.update({
        where: { id: asset.id },
        data: { nextEarningsAt: new Date(Date.now() - 1000000) }
    });

    console.log(`Triggering earnings for ${asset.symbol}`);
    await processEarningsCycles();

    console.log("Checking resulting DB entries...");
    const latestNews = await prisma.newsStory.findMany({
        where: { targetSector: asset.sector },
        orderBy: { publishedAt: 'desc' },
        take: 3
    });

    console.log(`Found ${latestNews.length} recent stories for sector.`);
    latestNews.forEach(n => {
        console.log(`\n--- ${n.headline} (isEarningsReport: ${n.isEarningsReport}) ---`);
        console.log(`Direction: ${n.direction} | Intensity: ${n.intensityWeight} | Noteworthy Score Check Enabled`);
        console.log(n.context.substring(0, 300) + "...\n[End of snippet]");
    });
}

runTest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
