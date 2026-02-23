const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Economy Base Data (V2 - Final Refined)...');

    const assets = await prisma.asset.findMany();
    const findAsset = (sym) => assets.find(a => a.symbol === sym);

    const economyMap = [
        {
            symbol: 'Q-MIN', // Deep Bore
            goodName: 'Raw Ores',
            inputs: []
        },
        {
            symbol: 'FUEL', // Refined Fuel
            goodName: 'Hydrocarbon Fuel',
            inputs: []
        },
        {
            symbol: 'URAN', // Enriched Uranium
            goodName: 'Enriched Uranium',
            inputs: []
        },
        {
            symbol: 'S-NUC', // SaltThorium Energy
            goodName: 'Clean Energy Grid',
            inputs: [
                { symbol: 'URAN', units: 1 }
            ]
        },
        {
            symbol: 'C-STE', // Green Steel
            goodName: 'High-Grade Steel',
            inputs: [
                { symbol: 'Q-MIN', units: 10 },
                { symbol: 'FUEL', units: 5 }
            ]
        },
        {
            symbol: 'P-SOF', // SoftBot Manufacturing
            goodName: 'Robotic Chassis',
            inputs: [
                { symbol: 'C-STE', units: 2 },
                { symbol: 'S-NUC', units: 1 }
            ]
        }
    ];

    for (const item of economyMap) {
        const asset = findAsset(item.symbol);
        if (!asset) {
            console.log(`Skipping ${item.symbol} (not found)`);
            continue;
        }

        // 1. Create/Update the Good
        let good = await prisma.good.findFirst({ where: { producerId: asset.id } });
        if (good) {
            good = await prisma.good.update({
                where: { id: good.id },
                data: {
                    name: item.goodName,
                    unit: 'UNIT',
                    baseProductionCost: 50,
                    listPrice: 100
                    // currentStockLevel we leave alone if it exists
                }
            });
        } else {
            good = await prisma.good.create({
                data: {
                    name: item.goodName,
                    producerId: asset.id,
                    unit: 'UNIT',
                    baseProductionCost: 50,
                    listPrice: 100,
                    currentStockLevel: 500
                }
            });
        }

        // 2. Set Input Requirements
        for (const input of item.inputs) {
            const inputAsset = findAsset(input.symbol);
            if (!inputAsset) continue;

            const inputGood = await prisma.good.findFirst({ where: { producerId: inputAsset.id } });
            if (!inputGood) {
                console.log(`Warning: ${input.symbol} provides no Good for ${asset.symbol}`);
                continue;
            }

            // InputRequirement doesn't have unique composite key in schema, find by values
            const req = await prisma.inputRequirement.findFirst({
                where: {
                    consumerId: asset.id,
                    inputGoodId: inputGood.id
                }
            });

            if (req) {
                await prisma.inputRequirement.update({
                    where: { id: req.id },
                    data: { unitsPerCycle: input.units }
                });
            } else {
                await prisma.inputRequirement.create({
                    data: {
                        consumerId: asset.id,
                        inputGoodId: inputGood.id,
                        unitsPerCycle: input.units
                    }
                });
            }
        }

        // 3. Give Initial Inventory
        for (const input of item.inputs) {
            const inputAsset = findAsset(input.symbol);
            const inputGood = await prisma.good.findFirst({ where: { producerId: inputAsset.id } });
            if (inputGood) {
                await prisma.goodInventory.upsert({
                    where: { assetId_goodId: { assetId: asset.id, goodId: inputGood.id } },
                    update: { quantity: 1000 },
                    create: { assetId: asset.id, goodId: inputGood.id, quantity: 1000 }
                });
            }
        }

        console.log(`✓ Seeded ${asset.symbol} producing ${good.name}`);
    }

    console.log('Final Economy seeding complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
