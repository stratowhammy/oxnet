import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log("Setting up staggered earnings schedule...");
    const stocks = await prisma.asset.findMany({ where: { type: 'STOCK' } });

    const now = Date.now();
    const periodMs = 72 * 60 * 60 * 1000; // 72 hours

    let updated = 0;
    for (const stock of stocks) {
        // Random time between now and 72 hours from now
        const offset = Math.floor(Math.random() * periodMs);
        const nextDate = new Date(now + offset);

        await prisma.asset.update({
            where: { id: stock.id },
            data: { nextEarningsAt: nextDate, earningsDrift: 0.0 }
        });
        updated++;
    }

    console.log(`Successfully staggered earnings schedule for ${updated} stocks over the next 72 hours.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
