const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSchema() {
    try {
        const user = await prisma.user.findFirst({ select: { id: true } });
        const asset = await prisma.asset.findFirst({ select: { id: true } });

        console.log('Testing Transaction creation with ticker field...');
        await prisma.transaction.create({
            data: {
                userId: user.id,
                assetId: asset.id,
                type: 'TEST',
                amount: 10,
                price: 1,
                fee: 0,
                ticker: 'DBTEST' // Does the client know about this?
            }
        });
    } catch (e) {
        console.log('--- ERROR LOG ---');
        console.log(e.message);
        if (e.meta) console.log('Meta:', JSON.stringify(e.meta));
    } finally {
        await prisma.$disconnect();
    }
}

debugSchema();
