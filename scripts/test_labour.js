const { PrismaClient } = require('@prisma/client');
const { runLabourMarketUpdate } = require('../src/labourWorker.js');

const prisma = new PrismaClient();

async function test() {
    console.log('--- MANUALLY TRIGGERING LABOUR TEST ---');

    // 1. Setup competitive imbalance
    // High wage for C-STE
    await prisma.productionFacility.updateMany({
        where: { asset: { symbol: 'C-STE' } },
        data: { wages: 150 }
    });
    // Low wage for FUEL
    await prisma.productionFacility.updateMany({
        where: { asset: { symbol: 'FUEL' } },
        data: { wages: 20 }
    });

    console.log('Wages adjusted: C-STE (150), FUEL (20). Sector average around 60.');

    // 2. Run update
    await runLabourMarketUpdate();

    // 3. Check results
    const results = await prisma.productionFacility.findMany({
        include: { asset: true }
    });

    console.log('\n--- LABOUR MARKET STATE ---');
    for (const f of results) {
        console.log(`${f.asset.symbol}: Wage=${f.wages}, Headcount=${f.headcount}, Strike=${f.onStrike}`);
    }

    console.log('--- TEST COMPLETE ---');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
