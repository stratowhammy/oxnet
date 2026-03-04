import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const assets = await prisma.asset.findMany();
    console.log(`Found ${assets.length} assets.`);

    const BARS_TO_GENERATE = 300;
    const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    for (const asset of assets) {
        const historyData = [];
        let currentPrice = asset.basePrice;
        const prices = [];

        // Generate chronological random walk
        for (let i = 0; i < BARS_TO_GENERATE; i++) {
            const volatility = 0.005; // 0.5% max variance
            const move = 1 + (Math.random() - 0.5) * 2 * volatility;
            const open = currentPrice;
            const close = open * move;
            const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
            const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

            prices.push({ open, high, low, close });
            currentPrice = close;
        }

        // Normalize so the last close exactly matches current basePrice
        const lastClose = prices[prices.length - 1].close;
        const correctionFactor = asset.basePrice / lastClose;

        const normalizedPrices = prices.map(p => ({
            open: p.open * correctionFactor,
            high: p.high * correctionFactor,
            low: p.low * correctionFactor,
            close: p.close * correctionFactor,
        }));

        // Map to specific sequential past timestamps
        for (let i = 0; i < BARS_TO_GENERATE; i++) {
            const timestamp = new Date(now - ((BARS_TO_GENERATE - 1 - i) * INTERVAL_MS));
            historyData.push({
                assetId: asset.id,
                open: normalizedPrices[i].open,
                high: normalizedPrices[i].high,
                low: normalizedPrices[i].low,
                close: normalizedPrices[i].close,
                timestamp
            });
        }

        await prisma.priceHistory.createMany({
            data: historyData
        });
        console.log(`Seeded 300 bars for ${asset.symbol}`);
    }

    console.log('Seeding complete.');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
