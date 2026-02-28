import { PrismaClient } from '@prisma/client';
import { maintainMarketMakerOrders } from '../src/lib/marketMaker.js';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';

async function resetMarketMakerOrders() {
    console.log("Deleting all pending Market Maker orders...");
    await prisma.limitOrder.deleteMany({
        where: {
            userId: MARKET_MAKER_ID,
            status: 'PENDING'
        }
    });

    console.log("Market Maker orders deleted. Maintaining orders for all assets...");
    const assets = await prisma.asset.findMany();

    for (const asset of assets) {
        if (asset.symbol !== 'DELTA') {
            await maintainMarketMakerOrders(asset.id);
        }
    }

    console.log("Market Maker order books rebuilt.");
    process.exit(0);
}

resetMarketMakerOrders().catch(e => {
    console.error(e);
    process.exit(1);
});
