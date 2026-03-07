import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        const result = await prisma.newsStory.updateMany({
            where: {
                tags: {
                    contains: "Q3 Earnings"
                }
            },
            data: {
                isEarningsReport: true
            }
        });
        console.log(`Updated ${result.count} old Q3 earnings reports to be hidden from the main feed.`);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
