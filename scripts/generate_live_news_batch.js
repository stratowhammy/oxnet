import { publishNewsStory } from '../src/engine.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting immediate batch generation of 6 news stories...");
    for (let i = 0; i < 6; i++) {
        console.log(`Generating story ${i + 1} of 6...`);
        await publishNewsStory();
    }
    console.log("Batch generation complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
