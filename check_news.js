import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function checkNews() {
    const news = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(news, null, 2));
}
checkNews().finally(() => prisma.$disconnect());
