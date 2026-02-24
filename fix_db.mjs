import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const result = await prisma.$executeRawUnsafe('DELETE FROM "Transaction" WHERE assetId IS NULL');
    console.log("Deleted null assetId transactions:", result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
