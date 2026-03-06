import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    // Force one asset to be due for earnings right now
    const stock = await prisma.asset.findFirst({ where: { type: 'STOCK' } });
    if (stock) {
        await prisma.asset.update({
            where: { id: stock.id },
            data: { nextEarningsAt: new Date(Date.now() - 1000) }
        });
        console.log(`Forced ${stock.symbol} to be due for earnings.`);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
