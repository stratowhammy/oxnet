import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function splitPiAsset() {
    const symbol = 'PI';
    const targetSupply = 314000;

    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) {
        console.error(`Asset ${symbol} not found`);
        process.exit(1);
    }

    const oldSupply = asset.supplyPool;
    const splitFactor = targetSupply / oldSupply;
    const newPrice = asset.demandPool / targetSupply;

    console.log(`Splitting ${symbol}:`);
    console.log(`  Old Supply: ${oldSupply}`);
    console.log(`  New Supply: ${targetSupply}`);
    console.log(`  Split Factor: ${splitFactor}`);
    console.log(`  Old Price: ${asset.basePrice}`);
    console.log(`  New Price: ${newPrice}`);

    await prisma.$transaction(async (tx) => {
        // 1. Update Asset
        await tx.asset.update({
            where: { id: asset.id },
            data: {
                supplyPool: targetSupply,
                basePrice: newPrice
            }
        });

        // 2. Update Portfolios
        const portfolios = await tx.portfolio.findMany({ where: { assetId: asset.id } });
        console.log(`Updating ${portfolios.length} portfolios...`);
        for (const p of portfolios) {
            await tx.portfolio.update({
                where: { id: p.id },
                data: {
                    quantity: p.quantity * splitFactor,
                    averageEntryPrice: p.averageEntryPrice / splitFactor,
                    liquidationPrice: p.liquidationPrice ? p.liquidationPrice / splitFactor : null,
                    // loanAmount remains the same as it's a delta value
                }
            });
        }

        // 3. Update Limit Orders
        const limitOrders = await tx.limitOrder.findMany({ where: { assetId: asset.id, status: 'PENDING' } });
        console.log(`Updating ${limitOrders.length} limit orders...`);
        for (const lo of limitOrders) {
            await tx.limitOrder.update({
                where: { id: lo.id },
                data: {
                    quantity: lo.quantity * splitFactor,
                    price: lo.price / splitFactor
                }
            });
        }
    });

    console.log("Split completed successfully.");
}

splitPiAsset()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
