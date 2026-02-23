const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.globalSetting.findMany();
    console.log(JSON.stringify(settings, null, 2));
}

main().finally(async () => await prisma.$disconnect());
