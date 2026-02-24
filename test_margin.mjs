import prisma from './src/lib/db.js';
import { AutomatedMarketMaker } from './src/lib/amm.js';

async function test() {
    const user = await prisma.user.findFirst();
    const asset = await prisma.asset.findFirst({ where: { symbol: { not: 'DELTA' } } });
    if (!user || !asset) return console.log("Missing user/asset");

    console.log(`Testing with User: ${user.username}, Asset: ${asset.symbol} @ $${asset.basePrice}`);

    const quantity = 100; // Total position size (Option B)
    const leverage = 5;

    console.log("Placing LONG order...");
    const res = await AutomatedMarketMaker.executeTrade({
        userId: user.id,
        assetId: asset.id,
        type: 'BUY',
        quantity: quantity,
        leverage: leverage,
        isInternal: false
    });

    console.log("Trade Result:", res);

    const portfolio = await prisma.portfolio.findFirst({
        where: { userId: user.id, assetId: asset.id, isShortPosition: false }
    });

    console.log("Portfolio Record:", portfolio);

    if (portfolio) {
        // Trigger a liquidation by forcing the price down
        console.log(`Forcing price to $1.00 to trigger liquidation (Target: ${portfolio.liquidationPrice})`);

        await prisma.asset.update({
            where: { id: asset.id },
            data: { basePrice: 1.00 }
        });

        console.log("Running checkLiquidations...");
        await AutomatedMarketMaker.checkLiquidations(asset.id);

        const checkPort = await prisma.portfolio.findFirst({
            where: { id: portfolio.id }
        });

        if (!checkPort) {
            console.log("SUCCESS: Portfolio was liquidated!");
        } else {
            console.log("FAILURE: Portfolio survived liquidation check.");
        }
    }
}

test().catch(console.error).finally(() => process.exit(0));
