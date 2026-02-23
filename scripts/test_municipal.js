const { PrismaClient } = require('@prisma/client');
const { runMunicipalUpdate } = require('../src/municipalWorker.js');

const prisma = new PrismaClient();

async function test() {
    console.log('--- VERIFYING MUNICIPAL ECONOMY ---');

    // 1. Setup - Assign user to a city and set high tax for testing
    const user = await prisma.user.findFirst({ where: { username: 'BeanKing' } });
    const city = await prisma.municipality.findFirst({ where: { name: 'Ironhaven' } });
    const good = await prisma.good.findFirst({ where: { isListedForSale: true } });

    if (!user || !city || !good) {
        console.error('Test setup failed: User, City, or Good not found.');
        return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { municipalityId: city.id } });
    await prisma.municipality.update({ where: { id: city.id }, data: { goodsTaxRate: 0.10, deltaReserve: 5000 } });

    console.log(`User ${user.username} assigned to ${city.name} (Tax Rate: 10%).`);
    const initialReserve = (await prisma.municipality.findUnique({ where: { id: city.id } })).deltaReserve;

    // 2. Test Taxation (Simulated via code matching purchase/route.ts)
    console.log('\n[Flow 1] Testing Taxation...');
    const quantity = 10;
    const totalCost = quantity * good.listPrice;
    const taxAmount = totalCost * 0.10;

    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { deltaBalance: { decrement: totalCost } } }),
        prisma.municipality.update({ where: { id: city.id }, data: { deltaReserve: { increment: taxAmount } } })
    ]);

    const updatedReserve = (await prisma.municipality.findUnique({ where: { id: city.id } })).deltaReserve;
    console.log(`City Reserve: ${initialReserve} -> ${updatedReserve} (Diff: +${updatedReserve - initialReserve})`);

    // 3. Test Contract Settlement
    console.log('\n[Flow 2] Testing Contract Settlement...');
    const initialBalance = (await prisma.user.findUnique({ where: { id: user.id } })).deltaBalance;

    // Create a contract and award it to the user
    const contract = await prisma.municipalContract.create({
        data: {
            municipalityId: city.id,
            goodId: good.id,
            quantityRequired: 5,
            budgetDelta: 200,
            deadline: new Date(Date.now() + 86400000),
            status: 'AWARDED'
        }
    });

    const bid = await prisma.municipalContractBid.create({
        data: {
            contractId: contract.id,
            bidderId: user.id,
            pricePerUnit: 150
        }
    });

    await prisma.municipalContract.update({
        where: { id: contract.id },
        data: { awardedBidId: bid.id }
    });

    console.log(`Contract #${contract.id} created and awarded to ${user.username} (Price: 150/unit, Qty: 5).`);

    // Run the municipal worker
    await runMunicipalUpdate();

    // Verify settlement
    const settledContract = await prisma.municipalContract.findUnique({ where: { id: contract.id } });
    const finalBalance = (await prisma.user.findUnique({ where: { id: user.id } })).deltaBalance;
    const finalReserve = (await prisma.municipality.findUnique({ where: { id: city.id } })).deltaReserve;

    console.log(`Contract Status: ${settledContract.status}`);
    console.log(`Supplier Balance: ${initialBalance} -> ${finalBalance} (Diff: +${finalBalance - initialBalance})`);
    console.log(`City Reserve: ${updatedReserve} -> ${finalReserve} (Diff: ${finalReserve - updatedReserve})`);

    console.log('--- TEST COMPLETE ---');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
