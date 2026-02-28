import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';

async function testCloseSpreadGap() {
    console.log(`[${new Date().toISOString()}] Closing spread gaps for all assets...`);
    try {
        const assets = await prisma.asset.findMany();
        let totalOps = [];

        for (const asset of assets) {
            const basePrice = asset.basePrice;

            const highestBuy = await prisma.limitOrder.findFirst({
                where: { assetId: asset.id, type: 'BUY', status: 'PENDING' },
                orderBy: { price: 'desc' }
            });
            const lowestSell = await prisma.limitOrder.findFirst({
                where: { assetId: asset.id, type: 'SELL', status: 'PENDING' },
                orderBy: { price: 'asc' }
            });

            const currentHighestBuy = highestBuy ? highestBuy.price : basePrice * 0.985;
            const currentLowestSell = lowestSell ? lowestSell.price : basePrice * 1.012;

            const step = basePrice * 0.002; // 0.2% increments

            // Fill BUY side gap
            if (basePrice - currentHighestBuy > step) {
                let currentInsertPrice = currentHighestBuy + step;
                let count = 0;
                while (currentInsertPrice < basePrice && count < 25) {
                    totalOps.push(prisma.limitOrder.create({
                        data: {
                            userId: MARKET_MAKER_ID,
                            assetId: asset.id,
                            type: 'BUY',
                            quantity: Math.floor(Math.random() * 200) + 10,
                            price: currentInsertPrice,
                            leverage: 1.0,
                            status: 'PENDING'
                        }
                    }));
                    currentInsertPrice += step;
                    count++;
                }
            }

            // Fill SELL side gap
            if (currentLowestSell - basePrice > step) {
                let currentInsertPrice = currentLowestSell - step;
                let count = 0;
                while (currentInsertPrice > basePrice && count < 25) {
                    totalOps.push(prisma.limitOrder.create({
                        data: {
                            userId: MARKET_MAKER_ID,
                            assetId: asset.id,
                            type: 'SELL',
                            quantity: Math.floor(Math.random() * 200) + 10,
                            price: currentInsertPrice,
                            leverage: 1.0,
                            status: 'PENDING'
                        }
                    }));
                    currentInsertPrice -= step;
                    count++;
                }
            }
        }

        if (totalOps.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < totalOps.length; i += chunkSize) {
                await prisma.$transaction(totalOps.slice(i, i + chunkSize));
            }
            console.log(`[Engine] Inserted ${totalOps.length} spread-tightening limit orders across all assets.`);
        } else {
            console.log("[Engine] No spread gaps needed to be filled.");
        }
    } catch (e) {
        console.error("Error closing spread gap:", e);
    }
}

testCloseSpreadGap()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
