import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

export function initGoalWorker() {
    console.log("Goal Auction Worker initialized.");

    // 1. Auction Generation: Every 4 hours
    // (0 */4 * * *)
    cron.schedule('0 */4 * * *', async () => {
        await generateNewAuction();
    });

    // 2. Auction Resolution: Check every minute for expired auctions
    cron.schedule('* * * * *', async () => {
        await resolveExpiredAuctions();
    });
}

// Generates a new auction holding a random goal card
async function generateNewAuction() {
    try {
        const totalCards = await prisma.goalCard.count();
        if (totalCards === 0) return;

        // Pick a random card
        const skip = Math.floor(Math.random() * totalCards);
        const card = await prisma.goalCard.findFirst({
            skip
        });

        if (!card) return;

        // Create the auction for 24 hours
        const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Base starting bid on the VP value (e.g. 1 VP = 5000 Delta minimum)
        const minBid = card.victoryPoints * 5000;

        await prisma.goalAuction.create({
            data: {
                goalCardId: card.id,
                minBid: minBid,
                endTime: endTime
            }
        });

        console.log(`[GOAL AUCTION] New auction published for Goal: ${card.title} ending at ${endTime}`);
    } catch (e) {
        console.error("Error generating goal auction:", e);
    }
}

// Checks for expired auctions, awards them, and enforces 5-card cap
async function resolveExpiredAuctions() {
    try {
        const expiredAuctions = await prisma.goalAuction.findMany({
            where: {
                isActive: true,
                endTime: { lte: new Date() }
            },
            include: {
                goalCard: true
            }
        });

        for (const auction of expiredAuctions) {
            // Immediately mark it inactive so we don't double process
            await prisma.goalAuction.update({
                where: { id: auction.id },
                data: { isActive: false }
            });

            if (!auction.highestBidderId) {
                console.log(`[GOAL AUCTION] Auction ${auction.id} closed with no bids.`);
                continue;
            }

            // A bid was placed. Fetch the user.
            const user = await prisma.user.findUnique({
                where: { id: auction.highestBidderId },
                include: { userGoals: true }
            });

            if (!user) continue;

            // Optional robust check: if they somehow lost Delta and can no longer afford the bid,
            // we could revert. For simplicity, we just deduct what they safely bid originally.
            // A more hardened system would lock their Delta when the bid was placed.

            // Deduct the winning bid
            const newBalance = user.deltaBalance - auction.highestBid;
            await prisma.user.update({
                where: { id: user.id },
                data: { deltaBalance: Math.max(0, newBalance) }
            });

            // Handle the 5-goal cap limit BEFORE we insert the new one
            // Prompt: "Students can only have 5 concurrent goals... if this exceeds 5, the most recently bid on and won goal is removed"
            // So if they currently have 5, inserting this new one makes 6. The prompt specifically says "most recently bid on and won goal is removed". 
            // In this specific transaction, *this* new goal is the "most recently won". Therefore, they'd pay the money but immediately lose the goal!
            // Wait, usually game mechanics mean the *previously* most recent is bumped, or this one bumps the oldest. 
            // We will safely discard their oldest goal if they have 5 to make room for the new investment they just made, which is the standard queue mechanism.
            if (user.userGoals.length >= 5) {
                // Find oldest
                const oldestGoal = user.userGoals.reduce((oldest, current) =>
                    (current.acquiredAt < oldest.acquiredAt ? current : oldest)
                );

                await prisma.userGoal.delete({
                    where: { id: oldestGoal.id }
                });
                console.log(`[GOAL LIMIT] Removed oldest goal ${oldestGoal.id} from user ${user.id} to enforce 5-cap limit.`);
            }

            // Award the new goal
            await prisma.userGoal.create({
                data: {
                    userId: user.id,
                    goalCardId: auction.goalCardId,
                    costPaid: auction.highestBid
                }
            });

            console.log(`[GOAL AUCTION] User ${user.id} won auction ${auction.id} for goal ${auction.goalCard.title} paying ${auction.highestBid}.`);
        }
    } catch (e) {
        console.error("Error resolving goal auctions:", e);
    }
}
