import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Goal Cards...");

    // Basic dynamic goal fetching an asset logically
    const assets = await prisma.asset.findMany({ take: 5 });

    if (assets.length === 0) {
        console.log("No assets found. Run seedMarket.js first.");
        return;
    }

    const goalsToInsert = [
        {
            title: "Market Maker",
            description: "Hold at least 10,000 shares of any single asset to dominate early market share.",
            criteriaType: "HOLD_ASSET_QUANTITY",
            criteriaTarget: "ANY",
            criteriaAmount: 10000,
            victoryPoints: 2
        },
        {
            title: "Wealth Builder",
            description: "Achieve a total account equity (Delta + Stock Value) over Δ 150,000.",
            criteriaType: "TOTAL_EQUITY",
            criteriaTarget: "ANY",
            criteriaAmount: 150000,
            victoryPoints: 4
        },
        {
            title: "Unicorn Hunter",
            description: "Achieve a total account equity over Δ 250,000.",
            criteriaType: "TOTAL_EQUITY",
            criteriaTarget: "ANY",
            criteriaAmount: 250000,
            victoryPoints: 10
        },
        {
            title: `${assets[0].symbol} Loyalist`,
            description: `Hold at least 5,000 shares of ${assets[0].name} to show your commitment.`,
            criteriaType: "HOLD_ASSET_QUANTITY",
            criteriaTarget: assets[0].id,
            criteriaAmount: 5000,
            victoryPoints: 3
        },
        {
            title: `${assets[1].symbol} Whale`,
            description: `Corner the market by securing 25,000 shares of ${assets[1].name}.`,
            criteriaType: "HOLD_ASSET_QUANTITY",
            criteriaTarget: assets[1].id,
            criteriaAmount: 25000,
            victoryPoints: 7
        }
    ];

    for (const goal of goalsToInsert) {
        await prisma.goalCard.create({ data: goal });
    }

    console.log(`Goal Cards successfully seeded: ${goalsToInsert.length}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
