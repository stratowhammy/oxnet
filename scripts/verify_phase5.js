const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('--- Phase 5 Verification ---');

    // 1. Check NPCs
    const npcs = await prisma.user.findMany({ where: { isNPC: true } });
    console.log(`Found ${npcs.length} NPC politicians.`);
    if (npcs.length > 0) {
        console.log('Sample NPC:', {
            name: npcs[0].username,
            rank: npcs[0].politicalRank,
            traits: npcs[0].traits,
            philosophy: npcs[0].philosophy
        });
    }

    // 2. Check Municipalities
    const capital = await prisma.municipality.findUnique({ where: { id: 'capital-district' } });
    console.log('Capital District:', capital ? 'EXISTS' : 'MISSING');

    // 3. Propose a Test Policy (optional/manual trigger)
    // const president = npcs.find(n => n.politicalRank === 4);
    // if (president) {
    //     await prisma.policyProposal.create({
    //         data: {
    //             title: 'Verification Act',
    //             description: 'Ensuring the system is operational.',
    //             policyType: 'TREATY',
    //             effectValue: 0.1,
    //             proposerId: president.id,
    //             endsAt: new Date(Date.now() + 600000) // 10 mins
    //         }
    //     });
    //     console.log('✓ Test Policy Proposed');
    // }

    await prisma.$disconnect();
}

verify().catch(console.error);
