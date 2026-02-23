const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function testMayorRegistration() {
    try {
        // Step 1: Find vacant municipality
        const muni = await p.municipality.findFirst({
            where: { mayorId: null },
            orderBy: { name: 'asc' }
        });
        console.log('Step 1 - Municipality:', muni?.name, muni?.id);
        if (!muni) { console.log('No vacant municipality!'); return; }

        // Step 2: Create user
        console.log('Step 2 - Creating user...');
        const user = await p.user.create({
            data: {
                username: 'TestMayor_Debug_' + Date.now(),
                password: 'hashedpw',
                playerRole: 'MAYOR',
                onboarded: true,
                backstory: 'Test backstory for debugging.',
                municipalityId: muni.id,
                politicalRank: 0
            }
        });
        console.log('Step 2 - User created:', user.id, user.username);

        // Step 3: Link municipality
        console.log('Step 3 - Linking municipality...');
        await p.municipality.update({
            where: { id: muni.id },
            data: { mayorId: user.id }
        });
        console.log('Step 3 - Municipality linked!');

        // Step 4: Create welcome event
        console.log('Step 4 - Creating welcome event...');
        await p.municipalEvent.create({
            data: {
                municipalityId: muni.id,
                eventType: 'ANNOUNCEMENT',
                title: 'New Mayor Arrives: ' + user.username,
                content: user.username + ' has been appointed as the new Mayor of ' + muni.name + '.'
            }
        });
        console.log('Step 4 - Welcome event created!');

        // Step 5: Mark invite as used
        console.log('Step 5 - Marking invite...');
        // We'll skip this since we're testing without an actual invite use

        console.log('\n✅ ALL STEPS PASSED - Registration would succeed!');

        // Cleanup: Remove the test user
        await p.municipalEvent.deleteMany({ where: { municipalityId: muni.id, title: { contains: 'TestMayor_Debug' } } });
        await p.municipality.update({ where: { id: muni.id }, data: { mayorId: null } });
        await p.user.delete({ where: { id: user.id } });
        console.log('Cleanup complete.');

    } catch (e) {
        console.error('\n❌ ERROR AT STEP:', e.message);
        if (e.code) console.error('Prisma Code:', e.code);
        if (e.meta) console.error('Meta:', JSON.stringify(e.meta));
        console.error('Full stack:', e.stack);
    } finally {
        await p.$disconnect();
    }
}

testMayorRegistration();
