import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
    const types = await prisma.asset.findMany({ select: { type: true }, distinct: ['type'] });
    console.log("Types:", types);
}
check().finally(() => prisma.$disconnect());
