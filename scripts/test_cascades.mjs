import prisma from '../src/lib/db.js';
import { AutomatedMarketMaker } from '../src/lib/amm.js';

async function main() {
    console.log("Starting Cascade Test...");

    const assetSymbol = 'V-AER'; // Using a known asset
    const asset = await prisma.asset.findFirst({ where: { symbol: assetSymbol } });
    if (!asset) {
        console.error("Asset not found");
        return;
    }

    const testUser = 'test_cascade_user';
    await prisma.user.upsert({
        where: { id: testUser },
        update: { deltaBalance: 10000000 },
        create: { id: testUser, deltaBalance: 10000000, role: 'USER', password: 'password' }
    });

    // 1. Clear existing pending limit orders for this asset to have a clean slate
    await prisma.limitOrder.deleteMany({
        where: { assetId: asset.id, status: 'PENDING' }
    });

    const startPrice = asset.basePrice;
    console.log(`Current Price for ${assetSymbol}: ${startPrice.toFixed(4)}`);

    // 2. Set up a chain of limit orders
    // We want a cascade of SELLs as price RISES.
    // Price at 100. Sell at 101, 102, 103.
    // Buying will move price UP.

    console.log("Creating chain of SELL limit orders with ABSOLUTE prices...");
    await prisma.limitOrder.createMany({
        data: [
            { userId: testUser, assetId: asset.id, type: 'SELL', quantity: 200, price: startPrice + 0.01, status: 'PENDING', leverage: 1 },
            { userId: testUser, assetId: asset.id, type: 'SELL', quantity: 200, price: startPrice + 0.02, status: 'PENDING', leverage: 1 },
            { userId: testUser, assetId: asset.id, type: 'SELL', quantity: 200, price: startPrice + 0.03, status: 'PENDING', leverage: 1 },
        ]
    });

    console.log("Executing a large BUY market order (1000 units) via AMM...");
    const data = await AutomatedMarketMaker.executeTrade({
        userId: testUser,
        assetId: asset.id,
        type: 'BUY',
        quantity: 1000
    });

    if (data.success) {
        console.log("Market BUY executed. Result Price:", data.executionPrice.toFixed(4));

        // Check the orders
        const orders = await prisma.limitOrder.findMany({
            where: { assetId: asset.id, userId: testUser }
        });

        const executedCount = orders.filter(o => o.status === 'EXECUTED').length;
        console.log(`Limit orders EXECUTED: ${executedCount} / 3`);

        const finalAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
        console.log(`Final Market Price: ${finalAsset.basePrice.toFixed(4)}`);

        if (executedCount === 3) {
            console.log("SUCCESS: Cascade verified.");
        } else {
            console.log("FAILURE: Cascade did not complete.");
        }
    } else {
        console.error("Market BUY failed:", data.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
