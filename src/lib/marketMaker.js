import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';
const TARGET_MM_ORDERS = 50;

export async function maintainMarketMakerOrders(assetId) {
    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;

        const basePrice = asset.basePrice;

        // Fetch ALL pending orders, not just MM orders, to ensure total depth
        const currentOrders = await prisma.limitOrder.findMany({
            where: {
                assetId: asset.id,
                status: 'PENDING'
            }
        });

        const buyOrders = currentOrders.filter(o => o.type === 'BUY');
        const sellOrders = currentOrders.filter(o => o.type === 'SELL');

        const ops = [];

        // If Buy orders fall below target depth, refill to target
        if (buyOrders.length < TARGET_MM_ORDERS) {
            console.log(`[MM] Refilling BUY orders for ${asset.symbol} (${buyOrders.length} -> ${TARGET_MM_ORDERS})`);
            for (let i = buyOrders.length; i < TARGET_MM_ORDERS; i++) {
                // Spread between 0% and 1.5% below market price
                const spread = Math.random() * 0.015;
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

        // If Sell orders fall below target depth, refill to target
        if (sellOrders.length < TARGET_MM_ORDERS) {
            console.log(`[MM] Refilling SELL orders for ${asset.symbol} (${sellOrders.length} -> ${TARGET_MM_ORDERS})`);
            for (let i = sellOrders.length; i < TARGET_MM_ORDERS; i++) {
                // Spread between 0% and 1.2% above market price
                const spread = Math.random() * 0.012;
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
