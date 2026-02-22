import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding 10 fresh accounts...");

    const usersToCreate = [
        { username: 'ez18', password: 'Ezra', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'trader1', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'trader2', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'trader3', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'trader4', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'shark1', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'shark2', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'whaler', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'bull', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' },
        { username: 'bear', password: 'password', deltaBalance: 100000.0, role: 'STUDENT' }
    ];

    for (const u of usersToCreate) {
        await prisma.user.create({ data: u });
        console.log(`Created user: ${u.username}`);
    }

    console.log("Auth Seeding Complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
