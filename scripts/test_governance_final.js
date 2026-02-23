const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- FINAL PHASE 9 GOVERNANCE VERIFICATION ---');

    try {
        // 1. Setup: Assign a Mayor
        const user = await prisma.user.findFirst({ where: { username: 'BeanKing' } });
        const city = await prisma.municipality.findFirst({ where: { name: 'New Oxford' } });
        const good = await prisma.good.findFirst({ where: { isListedForSale: true } });

        if (!user || !city || !good) {
            console.error('Setup failed: User, City, or Good not found.');
            return;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { playerRole: 'MAYOR', municipalityId: city.id }
        });
        await prisma.municipality.update({
            where: { id: city.id },
            data: { mayorId: user.id }
        });

        console.log(`User ${user.username} is now the Mayor of ${city.name}.`);

        // 2. Test Mayor Settings Update (Tax & Description)
        console.log('\n[Action 1] Testing Mayor Settings...');
        const newDesc = "The financial heart of the federation, now with optimized taxation.";
        const updateRes = await prisma.municipality.update({
            where: { id: city.id },
            data: { goodsTaxRate: 0.04, description: newDesc }
        });
        console.log(`✓ Updated tax to ${updateRes.goodsTaxRate} and description: ${updateRes.description.substring(0, 30)}...`);

        // 3. Test Contract Issuance
        console.log('\n[Action 2] Testing Contract Issuance...');
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        const contract = await prisma.municipalContract.create({
            data: {
                municipalityId: city.id,
                goodId: good.id,
                quantityRequired: 20,
                budgetDelta: 500,
                deadline,
                status: 'OPEN'
            }
        });
        console.log(`✓ Issued contract #${contract.id} for ${good.name}.`);

        // 4. Test Bidding
        console.log('\n[Action 3] Testing Bidding...');
        const bidder = await prisma.user.findFirst({ where: { isNPC: true, playerRole: 'CEO' } });
        const bid = await prisma.municipalContractBid.create({
            data: {
                contractId: contract.id,
                bidderId: bidder.id,
                pricePerUnit: 22
            }
        });
        console.log(`✓ Bid submitted by ${bidder.username} at 22/unit.`);

        // 5. Cleanup (optional, but good for repeatability)
        // No cleanup needed for now to see state in DB

    } catch (e) {
        console.error('Verification failed:', e);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
