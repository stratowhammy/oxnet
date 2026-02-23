
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const code = 'BCW9WYGF';
    const playerRole = 'MAYOR';
    const password = 'password123';

    console.log(`Starting manual registration for role: ${playerRole} using code: ${code}`);

    // 1. Validate invite
    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) throw new Error('Invite not found');
    if (invite.used) throw new Error('Invite already used');

    // 2. Find municipality
    const municipality = await prisma.municipality.findFirst({
        where: { mayorId: null },
        orderBy: { name: 'asc' }
    });
    if (!municipality) throw new Error('No municipality available for Mayor');

    // 3. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = "Mayor Admin Test";

    const newUser = await prisma.user.create({
        data: {
            username: username,
            password: hashedPassword,
            playerRole: playerRole,
            onboarded: true,
            backstory: "A dedicated administrator created for verification purposes.",
            municipalityId: municipality.id,
            politicalRank: 0
        }
    });

    // 4. Update municipality
    await prisma.municipality.update({
        where: { id: municipality.id },
        data: { mayorId: newUser.id }
    });

    // 5. Mark invite as used
    await prisma.inviteCode.update({
        where: { code },
        data: { used: true, usedById: newUser.id, usedAt: new Date() }
    });

    console.log('Registration Successful!');
    console.log(JSON.stringify({
        userId: newUser.id,
        username: newUser.username,
        municipality: municipality.name
    }, null, 2));
}

main()
    .catch(e => {
        console.error('Registration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
