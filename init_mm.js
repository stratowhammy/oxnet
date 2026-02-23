const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function maintainMarketMakerOrders(assetId) {
    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;

        const basePrice = asset.basePrice;
        const currentOrders = await prisma.limitOrder.findMany({
            where: { userId: '10101010', assetId: asset.id, status: 'PENDING' }
        });

        let buyOrdersCount = currentOrders.filter(o => o.type === 'BUY').length;
        let sellOrdersCount = currentOrders.filter(o => o.type === 'SELL').length;

        const ops = [];
        let currentBuyPrice = basePrice * 0.999;
        for (let i = buyOrdersCount; i < 15; i++) {
            ops.push(prisma.limitOrder.create({
                data: { userId: '10101010', assetId: asset.id, type: 'BUY', quantity: Math.floor(Math.random() * 500) + 10, price: currentBuyPrice, leverage: 1.0, status: 'PENDING' }
            }));
            currentBuyPrice *= 0.995;
        }

        let currentSellPrice = basePrice * 1.001;
        for (let i = sellOrdersCount; i < 15; i++) {
            ops.push(prisma.limitOrder.create({
                data: { userId: '10101010', assetId: asset.id, type: 'SELL', quantity: Math.floor(Math.random() * 500) + 10, price: currentSellPrice, leverage: 1.0, status: 'PENDING' }
            }));
            currentSellPrice *= 1.005;
        }

        if (ops.length > 0) {
            await prisma.$transaction(ops);
        }
    } catch (e) {
        console.error('Error maintaining MM orders:', e);
    }
}

async function initAllMarketMakerOrders() {
    try {
        const assets = await prisma.asset.findMany();
        for (const asset of assets) {
            await maintainMarketMakerOrders(asset.id);
        }
        console.log('Market Maker orders initialized.');
    } catch (e) {
        console.error('Failed to init MM orders:', e);
    }
}

initAllMarketMakerOrders()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); process.exit(1); });
