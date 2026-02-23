const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Listing Industrial Goods for Sale...');

    await prisma.good.updateMany({
        where: {
            name: {
                in: [
                    'Raw Ores',
                    'Hydrocarbon Fuel',
                    'Enriched Uranium',
                    'Clean Energy Grid',
                    'High-Grade Steel',
                    'Robotic Chassis'
                ]
            }
        },
        data: { isListedForSale: true }
    });

    console.log('Goods listed successfully!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
