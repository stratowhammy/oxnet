import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';
const TARGET_MM_ORDERS = 15;

export async function maintainMarketMakerOrders(assetId) {
    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;

        const basePrice = asset.basePrice;

        const currentOrders = await prisma.limitOrder.findMany({
            where: {
                userId: MARKET_MAKER_ID,
                assetId: asset.id,
                status: 'PENDING'
            }
        });

        const buyOrdersCount = currentOrders.filter(o => o.type === 'BUY').length;
        const sellOrdersCount = currentOrders.filter(o => o.type === 'SELL').length;

        const ops = [];

        let currentBuyPrice = basePrice * 0.999;
        for (let i = buyOrdersCount; i < TARGET_MM_ORDERS; i++) {
            ops.push(prisma.limitOrder.create({
                data: {
                    userId: MARKET_MAKER_ID,
                    assetId: asset.id,
                    type: 'BUY',
                    quantity: Math.floor(Math.random() * 500) + 10,
                    price: currentBuyPrice,
                    leverage: 1.0,
                    status: 'PENDING'
                }
            }));
            currentBuyPrice *= 0.995;
        }

        let currentSellPrice = basePrice * 1.001;
        for (let i = sellOrdersCount; i < TARGET_MM_ORDERS; i++) {
            ops.push(prisma.limitOrder.create({
                data: {
                    userId: MARKET_MAKER_ID,
                    assetId: asset.id,
                    type: 'SELL',
                    quantity: Math.floor(Math.random() * 500) + 10,
                    price: currentSellPrice,
                    leverage: 1.0,
                    status: 'PENDING'
                }
            }));
            currentSellPrice *= 1.005;
        }

        if (ops.length > 0) {
            await prisma.$transaction(ops);
        }
    } catch (e) {
        console.error("Error maintaining MM orders:", e);
    }
}
