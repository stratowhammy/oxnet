import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
    const assets = await prisma.asset.findMany({
        where: { symbol: 'ARG' },
        include: {
            priceHistory: {
                orderBy: { timestamp: 'asc' }
            }
        },
        take: 1
    });

    for (const a of assets) {
        console.log(`Asset: ${a.symbol} - ${a.name}`);
        let lastClose = null;
        for (const ph of a.priceHistory) {
            if (lastClose !== null && Math.abs(ph.open - lastClose) > 0.01) {
                console.log(`GAP DETECTED: ${ph.timestamp.toISOString()} | Open: ${ph.open.toFixed(2)} | Previous Close: ${lastClose.toFixed(2)}`);
            }
            lastClose = ph.close;
        }
    }
}

checkDb().finally(() => prisma.$disconnect());
