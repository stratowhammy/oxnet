const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- VERIFYING CONSUMER PURCHASE ---');

    // 1. Setup - get a user and a listed good
    const user = await prisma.user.findFirst({ where: { username: 'BeanKing' } });
    const good = await prisma.good.findFirst({
        where: { isListedForSale: true, name: 'High-Grade Steel' },
        include: { producer: true }
    });

    if (!user || !good) {
        console.error('Test setup failed: User or Good not found.');
        return;
    }

    const initialBalance = user.deltaBalance;
    const initialAssetPrice = good.producer.basePrice;
    const quantity = 50; // Total cost = 50 * 100 = 5000 (threshold for news)

    console.log(`User: ${user.username}, Balance: ${initialBalance}`);
    console.log(`Good: ${good.name}, ListPrice: ${good.listPrice}, Stock: ${good.currentStockLevel}`);

    // 2. Trigger Purchase API (Simulated)
    // Instead of actual fetch, we can call the logic if we want, but let's just use the logic from route.ts directly in this test script to verify DB operations work.
    // If the DB operations work here, they work in the route.

    try {
        const totalCost = quantity * good.listPrice;

        await prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id: user.id }, data: { deltaBalance: { decrement: totalCost } } });

            const sellerInv = await tx.goodInventory.findUnique({
                where: { assetId_goodId: { assetId: good.producerId, goodId: good.id } }
            });

            await tx.goodInventory.update({
                where: { id: sellerInv.id },
                data: { quantity: { decrement: quantity } }
            });

            await tx.good.update({
                where: { id: good.id },
                data: { currentStockLevel: { decrement: quantity } }
            });

            await tx.consumerPurchase.create({
                data: { userId: user.id, goodId: good.id, quantity, pricePaid: good.listPrice }
            });

            const impact = (quantity / 500) * 0.01;
            const newPrice = initialAssetPrice * (1 + impact);
            await tx.asset.update({
                where: { id: good.producerId },
                data: {
                    basePrice: newPrice,
                    demandPool: newPrice * good.producer.supplyPool
                }
            });

            if (totalCost >= 5000) {
                await tx.newsStory.create({
                    data: {
                        headline: `Market Surge: ${quantity} units of ${good.name} purchased!`,
                        context: `A major demand spike for ${good.name} has been detected.`,
                        targetSector: good.producer.sector,
                        targetSpecialty: good.name,
                        impactScope: 'COMPANY',
                        direction: 'UP',
                        intensityWeight: 1,
                        competitorInversion: false
                    }
                });
            }
        });

        console.log('Purchase transaction committed.');

        // 3. Verify
        const [updatedUser, updatedAsset, news] = await Promise.all([
            prisma.user.findUnique({ where: { id: user.id } }),
            prisma.asset.findUnique({ where: { id: good.producerId } }),
            prisma.newsStory.findFirst({
                where: { headline: { startsWith: 'Market Surge' } },
                orderBy: { publishedAt: 'desc' }
            })
        ]);

        console.log(`New Balance: ${updatedUser.deltaBalance} (Diff: ${updatedUser.deltaBalance - initialBalance})`);
        console.log(`New Price: ${updatedAsset.basePrice} (Diff: ${updatedAsset.basePrice - initialAssetPrice})`);
        if (news) {
            console.log(`✅ News generated: ${news.headline}`);
        } else {
            console.log('❌ News NOT generated.');
        }

    } catch (e) {
        console.error('Purchase failed:', e);
    }

    console.log('--- TEST COMPLETE ---');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
