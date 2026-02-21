import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purge() {
    console.log("Purging all price history...");
    const result = await prisma.priceHistory.deleteMany({});
    console.log(`Deleted ${result.count} records.`);
}

purge().finally(() => prisma.$disconnect());
