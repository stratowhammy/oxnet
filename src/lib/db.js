import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL + "?connection_limit=1&socket_timeout=30" : undefined
    });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
