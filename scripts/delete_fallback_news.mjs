import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteFallbackNews() {
    console.log("Searching for fallback news stories...");

    try {
        const result = await prisma.newsStory.deleteMany({
            where: {
                context: {
                    startsWith: 'Recent events involving'
                }
            }
        });

        console.log(`Successfully deleted ${result.count} fallback news stories.`);
    } catch (error) {
        console.error("Error deleting news stories:", error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteFallbackNews();
