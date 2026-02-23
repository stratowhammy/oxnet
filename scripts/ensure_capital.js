const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.municipality.upsert({
        where: { name: 'The Capital' },
        update: {},
        create: {
            id: 'capital-district',
            name: 'The Capital',
            description: 'The seat of federal power, where laws are debated and national leaders are chosen.'
        }
    });
    console.log('✓ Capital District Ensured');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
