import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: {
            OR: [
                { username: 'admin' },
                { playerRole: 'ADMIN' },
                { id: '10101010' } // Central bank often has admin-like status
            ]
        }
    });

    if (!admin) {
        console.error("Admin user not found.");
        process.exit(1);
    }

    const newPassword = 'admin'; // User likely wants a simple reset to 'admin'
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
    });

    console.log(`Successfully reset password for admin user: ${admin.username}`);
    console.log(`New password: ${newPassword}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
