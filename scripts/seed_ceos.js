const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding NPC CEOs (Final Fix)...');

    const npcCeos = [
        { username: 'Industrialist_Jack' },
        { username: 'Mining_Magnate_Mina' },
        { username: 'Energy_Tycoon_Ted' },
        { username: 'Tech_Titan_Tara' },
        { username: 'Steel_Sovereign_Sam' }
    ];

    for (const npc of npcCeos) {
        await prisma.user.upsert({
            where: { username: npc.username },
            update: { playerRole: 'CEO', isNPC: true },
            create: {
                username: npc.username,
                playerRole: 'CEO',
                password: 'npc_logic',
                isNPC: true,
                deltaBalance: 1000000
            }
        });
        console.log(`✓ Seeded NPC CEO: ${npc.username}`);
    }

    console.log('NPC CEO seeding complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
