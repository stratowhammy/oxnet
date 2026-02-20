import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create Assets
    const assets = [
        { symbol: 'AAPL', type: 'STOCK', basePrice: 150.0, supplyPool: 1000000, demandPool: 150000000 },
        { symbol: 'TSLA', type: 'STOCK', basePrice: 200.0, supplyPool: 500000, demandPool: 100000000 },
        { symbol: 'BTC', type: 'CRYPTO', basePrice: 50000.0, supplyPool: 1000, demandPool: 50000000 },
        { symbol: 'ETH', type: 'CRYPTO', basePrice: 3000.0, supplyPool: 10000, demandPool: 30000000 },
        { symbol: 'UScB', type: 'BOND', basePrice: 100.0, supplyPool: 5000000, demandPool: 500000000 },
    ];

    console.log('Seeding assets...');
    for (const asset of assets) {
        await prisma.asset.upsert({
            where: { symbol: asset.symbol },
            update: {},
            create: asset,
        });
    }

    // Create Users
    const users = [
        { id: 'demo-user-1', role: 'STUDENT', deltaBalance: 100000.0 },
        { id: 'admin-user', role: 'ADMIN', deltaBalance: 100000.0 },
    ];

    console.log('Seeding users...');
    for (const user of users) {
        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: user,
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
