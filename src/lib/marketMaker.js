import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';
const TARGET_MM_ORDERS = 40;

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

        const buyOrders = currentOrders.filter(o => o.type === 'BUY');
        const sellOrders = currentOrders.filter(o => o.type === 'SELL');

        const ops = [];

        // If Buy orders fall below 35, refill to 40
        if (buyOrders.length < 35) {
            console.log(`[MM] Refilling BUY orders for ${asset.symbol} (${buyOrders.length} -> 40)`);
            for (let i = buyOrders.length; i < TARGET_MM_ORDERS; i++) {
                // Spread between 1% and 5%
                const spread = 0.01 + (Math.random() * 0.04);
                ops.push(prisma.limitOrder.create({
                    data: {
                        userId: MARKET_MAKER_ID,
                        assetId: asset.id,
                        type: 'BUY',
                        quantity: Math.floor(Math.random() * 500) + 20,
                        price: basePrice * (1 - spread),
                        leverage: 1.0,
                        status: 'PENDING'
                    }
                }));
            }
        }

        // If Sell orders fall below 35, refill to 40
        if (sellOrders.length < 35) {
            console.log(`[MM] Refilling SELL orders for ${asset.symbol} (${sellOrders.length} -> 40)`);
            for (let i = sellOrders.length; i < TARGET_MM_ORDERS; i++) {
                // Spread between 1% and 5%
                const spread = 0.01 + (Math.random() * 0.04);
                ops.push(prisma.limitOrder.create({
                    data: {
                        userId: MARKET_MAKER_ID,
                        assetId: asset.id,
                        type: 'SELL',
                        quantity: Math.floor(Math.random() * 500) + 20,
                        price: basePrice * (1 + spread),
                        leverage: 1.0,
                        status: 'PENDING'
                    }
                }));
            }
        }

        if (ops.length > 0) {
            await prisma.$transaction(ops);
        }
    } catch (e) {
        console.error("Error maintaining MM orders:", e);
    }
}
