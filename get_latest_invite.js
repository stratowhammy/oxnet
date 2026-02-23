
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const latestInvite = await prisma.inviteCode.findFirst({
        orderBy: { createdAt: 'desc' },
    });
    console.log(JSON.stringify(latestInvite, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
