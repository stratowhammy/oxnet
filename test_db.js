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
        for (const ph of a.priceHistory) {
            console.log(`${ph.timestamp.toISOString()} | Open: ${ph.open.toFixed(2)} | Close: ${ph.close.toFixed(2)} | H: ${ph.high.toFixed(2)} | L: ${ph.low.toFixed(2)}`);
        }
    }
}

checkDb().finally(() => prisma.$disconnect());
