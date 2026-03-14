import { PrismaClient } from '@prisma/client';
import { generateDailyNews } from '../src/lib/newsManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHS_PATH = path.join(__dirname, '../data/news_archs.json');

async function main() {
    console.log("Erasing all current news stories...");
    await prisma.newsStory.deleteMany();
    console.log("News stories erased.");

    console.log("Resetting news archs...");
    fs.writeFileSync(ARCHS_PATH, JSON.stringify({ activeArchs: [] }, null, 2));
    console.log("News archs reset.");

    console.log("Publishing 8 new news stories...");
    await generateDailyNews();
    console.log("Finished publishing news.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
