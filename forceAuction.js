import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateImmediateAuction() {
    try {
        const totalCards = await prisma.goalCard.count();
        if (totalCards === 0) return;

        const skip = Math.floor(Math.random() * totalCards);
        const card = await prisma.goalCard.findFirst({
            skip
        });

        if (!card) return;

        const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const minBid = card.victoryPoints * 5000;

        await prisma.goalAuction.create({
            data: {
                goalCardId: card.id,
                minBid: minBid,
                endTime: endTime
            }
        });

        console.log(`[TEST GOAL AUCTION] Forced auction published for Goal: ${card.title} ending at ${endTime}`);
    } catch (e) {
        console.error("Error generating goal auction:", e);
    } finally {
        await prisma.$disconnect();
    }
}

generateImmediateAuction();
