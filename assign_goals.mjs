import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Role-aligned goal card definitions
const GOAL_CARDS = {
    // CEO goals — focused on company management & influence
    CEO: [
        {
            title: 'Empire Builder',
            description: 'Grow your total equity (Delta + stock value) to over Δ 500,000.',
            criteriaType: 'TOTAL_EQUITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 500000,
            victoryPoints: 5,
        },
        {
            title: 'Majority Stakeholder',
            description: 'Hold at least 5,000 shares of the company you manage.',
            criteriaType: 'HOLD_ASSET_QUANTITY',
            criteriaTarget: 'MANAGED',  // Special: resolved to user's managedAssetId
            criteriaAmount: 5000,
            victoryPoints: 4,
        },
    ],
    // Hedge Fund Manager goals — focused on fund performance
    HEDGE_FUND: [
        {
            title: 'Fund Growth',
            description: 'Grow your total equity (Delta + stock value) to over Δ 250,000.',
            criteriaType: 'TOTAL_EQUITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 250000,
            victoryPoints: 4,
        },
        {
            title: 'Diversified Portfolio',
            description: 'Hold at least 1,000 shares of any single asset.',
            criteriaType: 'HOLD_ASSET_QUANTITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 1000,
            victoryPoints: 3,
        },
    ],
    // Retail Investor goals — starter-friendly
    RETAIL: [
        {
            title: 'Wealth Builder',
            description: 'Grow your total equity (Delta + stock value) to over Δ 150,000.',
            criteriaType: 'TOTAL_EQUITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 150000,
            victoryPoints: 4,
        },
        {
            title: 'Market Maker',
            description: 'Hold at least 500 shares of any single asset.',
            criteriaType: 'HOLD_ASSET_QUANTITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 500,
            victoryPoints: 2,
        },
    ],
    // Default for unset/admin users
    DEFAULT: [
        {
            title: 'Wealth Builder',
            description: 'Grow your total equity (Delta + stock value) to over Δ 150,000.',
            criteriaType: 'TOTAL_EQUITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 150000,
            victoryPoints: 4,
        },
        {
            title: 'Market Maker',
            description: 'Hold at least 500 shares of any single asset.',
            criteriaType: 'HOLD_ASSET_QUANTITY',
            criteriaTarget: 'ANY',
            criteriaAmount: 500,
            victoryPoints: 2,
        },
    ],
};

async function assignGoalsToUser(userId, role, managedAssetId) {
    // Check if user already has goals
    const existing = await prisma.userGoal.findMany({ where: { userId } });
    if (existing.length >= 2) {
        console.log(`  ⏭ User ${userId} already has ${existing.length} goals, skipping.`);
        return;
    }

    const goalDefs = GOAL_CARDS[role] || GOAL_CARDS.DEFAULT;

    for (const def of goalDefs) {
        // Resolve MANAGED target for CEOs
        let criteriaTarget = def.criteriaTarget;
        if (criteriaTarget === 'MANAGED' && managedAssetId) {
            criteriaTarget = managedAssetId;
        } else if (criteriaTarget === 'MANAGED') {
            criteriaTarget = 'ANY'; // Fallback if CEO has no managed asset
        }

        // Find or create the goal card
        let card = await prisma.goalCard.findFirst({
            where: {
                title: def.title,
                criteriaType: def.criteriaType,
                criteriaTarget: criteriaTarget,
                criteriaAmount: def.criteriaAmount,
            }
        });

        if (!card) {
            card = await prisma.goalCard.create({
                data: {
                    title: def.title,
                    description: def.description,
                    criteriaType: def.criteriaType,
                    criteriaTarget: criteriaTarget,
                    criteriaAmount: def.criteriaAmount,
                    victoryPoints: def.victoryPoints,
                }
            });
            console.log(`  📋 Created goal card: "${card.title}"`);
        }

        // Assign to user
        await prisma.userGoal.create({
            data: {
                userId: userId,
                goalCardId: card.id,
                costPaid: 0, // Free assignment
            }
        });
        console.log(`  ✓ Assigned "${card.title}" to user ${userId}`);
    }
}

async function main() {
    console.log('Assigning goal cards to all users...\n');

    const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true, username: true, playerRole: true, managedAssetId: true }
    });

    for (const user of users) {
        console.log(`User: ${user.username || user.id} (role: ${user.playerRole})`);
        await assignGoalsToUser(user.id, user.playerRole || 'DEFAULT', user.managedAssetId);
    }

    console.log(`\nDone! Assigned goals to ${users.length} users.`);
    await prisma.$disconnect();
}

main();
