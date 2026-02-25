import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKET_MAKER_ID = '10101010';

async function injectLiquidity() {
    console.log("🚀 Starting Bulk Liquidity Injection...");
    const assets = await prisma.asset.findMany();

    for (const asset of assets) {
        console.log(`Injecting depth for ${asset.symbol} (Base Δ ${asset.basePrice.toFixed(2)})...`);
        const ops = [];

        // Add 25 Buy Orders (0.5% to 9.5% below market)
        for (let i = 0; i < 25; i++) {
            const spread = 0.005 + (i * (0.09 / 24)); // Linearly spread from 0.5% to 9.5%
            const price = asset.basePrice * (1 - spread);
            ops.push(prisma.limitOrder.create({
                data: {
                    userId: MARKET_MAKER_ID,
                    assetId: asset.id,
                    type: 'BUY',
                    quantity: Math.floor(Math.random() * 800) + 50,
                    price: price,
                    leverage: 1.0,
                    status: 'PENDING'
                }
            }));
        }

        // Add 25 Sell Orders (0.5% to 9.5% above market)
        for (let i = 0; i < 25; i++) {
            const spread = 0.005 + (i * (0.09 / 24));
            const price = asset.basePrice * (1 + spread);
            ops.push(prisma.limitOrder.create({
                data: {
                    userId: MARKET_MAKER_ID,
                    assetId: asset.id,
                    type: 'SELL',
                    quantity: Math.floor(Math.random() * 800) + 50,
                    price: price,
                    leverage: 1.0,
                    status: 'PENDING'
                }
            }));
        }

        await prisma.$transaction(ops);
        console.log(`✅ Injected 50 orders for ${asset.symbol}`);
    }

    console.log("🏁 Liquidity injection complete.");
}

injectLiquidity()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
