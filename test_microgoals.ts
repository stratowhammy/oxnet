import { PrismaClient } from '@prisma/client';
import { evaluateGoalStatus } from './src/lib/goals';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Verification...");

    // 1. Create a dummy user
    const username = `TestUser_${Date.now()}`;
    const user = await prisma.user.create({
        data: {
            username,
            password: "password",
            role: "STUDENT",
            playerRole: "RETAIL",
            onboarded: true,
            deltaBalance: 100000
        }
    });
    console.log(`Created user ${username} (ID: ${user.id})`);

    // 2. Simulate Onboard API Goal Assignment
    const GOAL_DEFS = {
        RETAIL: [
            { title: 'Wealth Builder', description: 'Grow your total equity (Delta + stock value) to over Δ 150,000.', criteriaType: 'TOTAL_EQUITY', criteriaTarget: 'ANY', criteriaAmount: 150000, victoryPoints: 4 },
            { title: 'Market Maker', description: 'Hold at least 500 shares of any single asset.', criteriaType: 'HOLD_ASSET_QUANTITY', criteriaTarget: 'ANY', criteriaAmount: 500, victoryPoints: 2 },
        ]
    };

    const DIVERSIFICATION_GOALS = [
        { title: 'Tech Mogul', description: 'Hold at least Δ 15,000 worth of stock in Technology.', criteriaTarget: 'Technology' },
        { title: 'Industrialist', description: 'Hold at least Δ 15,000 worth of stock in Manufacturing.', criteriaTarget: 'Manufacturing' },
        { title: 'Medical Pioneer', description: 'Hold at least Δ 15,000 worth of stock in Healthcare.', criteriaTarget: 'Healthcare' },
        { title: 'Energy Baron', description: 'Hold at least Δ 15,000 worth of stock in Energy.', criteriaTarget: 'Energy' },
        { title: 'Financial Whale', description: 'Hold at least Δ 15,000 worth of stock in Finance.', criteriaTarget: 'Finance' }
    ].map(g => ({ ...g, criteriaType: 'HOLD_SECTOR_NOTIONAL', criteriaAmount: 15000, victoryPoints: 10 }));

    for (const def of GOAL_DEFS.RETAIL) {
        let card = await prisma.goalCard.findFirst({ where: { title: def.title } });
        if (!card) card = await prisma.goalCard.create({ data: def });
        await prisma.userGoal.create({ data: { userId: user.id, goalCardId: card.id, costPaid: 0 } });
    }

    const shuffled = [...DIVERSIFICATION_GOALS].sort(() => 0.5 - Math.random()).slice(0, 3);
    for (const def of shuffled) {
        let card = await prisma.goalCard.findFirst({ where: { title: def.title } });
        if (!card) card = await prisma.goalCard.create({ data: def });
        await prisma.userGoal.create({ data: { userId: user.id, goalCardId: card.id, costPaid: 0 } });
    }

    // 3. Verify Assignment
    let uGoals = await prisma.userGoal.findMany({ where: { userId: user.id }, include: { goalCard: true } });
    console.log(`Assigned ${uGoals.length} goals (Expected 5). Titles: ${uGoals.map(g => g.goalCard.title).join(', ')}`);

    // 4. Test Dynamics
    console.log("\nTesting initial state (should be POTENTIAL)...");
    for (const ug of uGoals) {
        const stat = await evaluateGoalStatus(user.id, ug.goalCardId);
        console.log(`  ${ug.goalCard.title}: ${stat}`);
    }

    // 5. Give them the required assets for one of their diversification goals
    const divGoal = uGoals.find(g => g.goalCard.criteriaType === 'HOLD_SECTOR_NOTIONAL');
    if (!divGoal) {
        console.log("No diversification goal found.");
        return;
    }
    const targetSector = divGoal.goalCard.criteriaTarget;
    console.log(`\nGiving user assets in sector: ${targetSector}`);

    // need an asset from this sector
    const asset = await prisma.asset.findFirst({ where: { sector: targetSector } });
    if (!asset) {
        console.log(`Could not find an asset for sector ${targetSector}`);
    } else {
        const qtyToMeet = 15000 / asset.basePrice;
        await prisma.portfolio.create({
            data: {
                userId: user.id,
                assetId: asset.id,
                quantity: qtyToMeet + 1, // slightly more
                averageEntryPrice: asset.basePrice,
                isShortPosition: false
            }
        });
        console.log(`Gave user ${qtyToMeet + 1} shares of ${asset.symbol} (Price: ${asset.basePrice})`);

        console.log("\nTesting status after acquiring assets (should be EARNED for target sector)...");
        for (const ug of uGoals) {
            const stat = await evaluateGoalStatus(user.id, ug.goalCardId);
            console.log(`  ${ug.goalCard.title}: ${stat}`);
        }
    }

}
main().catch(console.error).finally(() => prisma.$disconnect());
