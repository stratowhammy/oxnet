const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock getSetting since it's used in isWithinTradingHours
async function getSetting(key) {
    const s = await prisma.globalSetting.findUnique({ where: { key } });
    return s?.value ?? null;
}

async function isWithinTradingHours() {
    const newsMode = await getSetting('NEWS_MODE');
    if (newsMode === '24_7') return true;

    const now = new Date();
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const est = new Date(estString);
    const day = est.getDay(); // 0=Sun, 6=Sat
    const hour = est.getHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}

async function main() {
    console.log('Testing 24/7 News Mode...');
    const result = await isWithinTradingHours();
    console.log(`isWithinTradingHours() result: ${result}`);

    if (result === true) {
        console.log('SUCCESS: 24/7 Mode is active.');
    } else {
        console.log('FAILURE: Trading hours restriction still applied.');
    }
}

main().finally(async () => await prisma.$disconnect());
