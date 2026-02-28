import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDb() {
    const stories = await prisma.newsStory.findMany();
    console.log(`News Stories in DB: ${stories.length}`);

    const wolf = await prisma.user.findFirst({ where: { username: 'CryptoWolf' } });
    console.log(`CryptoWolf exists: ${wolf ? 'Yes (ID: ' + wolf.id + ')' : 'No'}`);
}
checkDb().finally(() => prisma.$disconnect());
