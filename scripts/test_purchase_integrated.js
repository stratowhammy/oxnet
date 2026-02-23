const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- TESTING INTEGRATED PURCHASE TAXATION ---');

    // Setup: ensure user belongs to a city
    const user = await prisma.user.findFirst({ where: { username: 'BeanKing' } });
    const city = await prisma.municipality.findFirst({ where: { name: 'Ironhaven' } });
    const good = await prisma.good.findFirst({ where: { isListedForSale: true } });

    if (!user || !city || !good) {
        console.error('Setup failed.');
        return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { municipalityId: city.id } });
    await prisma.municipality.update({ where: { id: city.id }, data: { goodsTaxRate: 0.05, deltaReserve: 0 } });

    console.log(`User ${user.username} is in ${city.name} (Tax: 5%).`);

    // We can't easily call fetch in this environment if we aren't using the browser tool.
    // Instead, I'll use the browser subagent to perform a purchase in the UI!
    console.log('Switching to browser verification...');
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
});
