const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Labour Market Data (Unique Owners)...');

    const assetSymbols = ['Q-MIN', 'FUEL', 'URAN', 'S-NUC', 'C-STE', 'P-SOF'];
    const assets = await prisma.asset.findMany({
        where: { symbol: { in: assetSymbols } }
    });

    // Find all CEO users to own these facilities
    const ceos = await prisma.user.findMany({
        where: { playerRole: 'CEO' }
    });

    if (ceos.length < assets.length) {
        console.warn(`Warning: Only ${ceos.length} CEOs found for ${assets.length} facilities. Some assets will be skipped.`);
    }

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        if (i >= ceos.length) {
            console.log(`Skipping facility for ${asset.symbol} - no unique CEO available.`);
            continue;
        }

        const owner = ceos[i];

        await prisma.productionFacility.upsert({
            where: { assetId: asset.id },
            update: {
                headcount: 50,
                maxCapacity: 100,
                wages: 60,
                onStrike: false
            },
            create: {
                assetId: asset.id,
                ownerId: owner.id,
                headcount: 50,
                maxCapacity: 100,
                wages: 60,
                onStrike: false
            }
        });
        console.log(`✓ Created/Updated ProductionFacility for ${asset.symbol} owned by ${owner.username}`);
    }

    console.log('Labour seeding complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
