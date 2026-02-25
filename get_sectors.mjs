import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const assets = await prisma.asset.findMany({
        distinct: ['sector'],
        select: { sector: true }
    });
    console.log(assets.map(a => a.sector));
}

main().catch(console.error).finally(() => prisma.$disconnect());
