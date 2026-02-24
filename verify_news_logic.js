import { publishNewsStory } from './src/engine.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function verify() {
    process.env.LLM_URL = 'http://127.0.0.1:1234/v1/chat/completions';
    process.env.LLM_MODEL = 'qwen/qwen3-vl-4b';
    console.log("Calling publishNewsStory()...");
    await publishNewsStory();
    console.log("Checking DB for newest story...");
    const news = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 1
    });
    console.log(JSON.stringify(news, null, 2));
}
verify().finally(() => prisma.$disconnect());
