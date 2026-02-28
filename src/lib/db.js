"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prismaClientSingleton = function () {
    return new client_1.PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL + "?connection_limit=1&socket_timeout=30" : undefined
    });
};
var globalForPrisma = globalThis;
var prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
