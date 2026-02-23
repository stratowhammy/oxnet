const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const assets = await prisma.asset.findMany({
        select: { symbol: true, name: true, sector: true }
    });
    console.log(JSON.stringify(assets, null, 2));
}

main().finally(async () => await prisma.$disconnect());
