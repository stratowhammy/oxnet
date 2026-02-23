const { PrismaClient } = require('@prisma/client');
const { runProductionCycle } = require('../src/productionWorker.js');

const prisma = new PrismaClient();

async function test() {
    console.log('--- VERIFYING NATIONAL POLICY IMPACT ---');

    try {
        // 1. Find a Good produced by an Energy company
        const good = await prisma.good.findFirst({
            where: { producer: { sector: 'Energy' } },
            include: { producer: { include: { productionFacility: true } } }
        });

        if (!good || !good.producer) {
            console.log('No Energy good/producer found for testing.');
            return;
        }

        const company = good.producer;
        console.log(`Testing with company ${company.symbol} producing ${good.name} (Sector: ${company.sector}).`);

        // Baseline production (ensure 100% headcount for consistency)
        if (!company.productionFacility) {
            console.log('Company has no production facility. Skipping.');
            return;
        }
        await prisma.productionFacility.update({
            where: { assetId: company.id },
            data: { headcount: 100, maxCapacity: 100, onStrike: false }
        });

        // 2. Create a Subsidy Policy that already "passed"
        console.log('\n[Flow 1] Passing a "Green Energy" Subsidy...');
        const user = await prisma.user.findFirst();
        const policy = await prisma.policyProposal.create({
            data: {
                proposerId: user.id,
                title: 'Green Energy Subsidy',
                description: '20% boost to all energy production.',
                policyType: 'SUBSIDY',
                targetSector: 'Energy',
                effectValue: 0.20,
                status: 'PASSED', // Manually pass for immediate testing
                endsAt: new Date(Date.now() - 1000)
            }
        });

        // 3. Run Production Cycle
        console.log('\n[Flow 2] Running Production Cycle with Subsidy...');

        // Reset stock to ensure baseUnits = 100
        await prisma.good.update({
            where: { id: good.id },
            data: { currentStockLevel: 0 }
        });

        const initialStock = 0;

        // Use the actual productionWorker (which now calls the policyEngine)
        // Note: In Node environment, we might need to handle the import/export
        // But since I updated the file on disk, I can try running it.

        await runProductionCycle();

        const updatedGood = await prisma.good.findUnique({ where: { id: good.id } });
        const actualBoost = updatedGood.currentStockLevel - initialStock;

        // Expectations: Base is 50-100 units. 100 * 1.0 (efficiency) * 1.2 (policy) = 120 units.
        console.log(`Production Output: ${actualBoost} units.`);

        if (actualBoost >= 110) {
            console.log('✓ SUCCESS: Production boosted by policy multiplier.');
        } else {
            console.log('📉 Production did not meet expected boosted levels (Expected ~120). Check multipliers.');
        }

        // 4. Cleanup
        await prisma.policyProposal.delete({ where: { id: policy.id } });

    } catch (e) {
        console.error('Verification error:', e);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
