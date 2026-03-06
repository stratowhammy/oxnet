import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const pi = await prisma.asset.findFirst({
        where: { name: { contains: 'Pi' } }
    });

    const portfolios = await prisma.portfolio.findMany({
        where: { assetId: pi.id }
    });

    console.log("PI Asset:", JSON.stringify(pi, null, 2));
    console.log("Portfolios:", JSON.stringify(portfolios, null, 2));
}

run().finally(() => prisma.$disconnect());
