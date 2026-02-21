import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching assets...");
    const assets = await prisma.asset.findMany();
    console.log(`Found ${assets.length} assets.`);

    const historyToInsert = [];
    const now = new Date();

    // Generate 100 points, spaced by 15 minutes each, stepping backwards
    const intervals = 100;
    const intervalMs = 15 * 60 * 1000;

    for (const asset of assets) {
        let currentPrice = asset.basePrice;

        // We want the most recent point to be close to the current basePrice, 
        // so we'll simulate backwards and then reverse it, or just generate standard walk backwards.
        // It's easier to walk backward: 
        // older points have higher variance from current basePrice.

        // Let's build the array of prices going backward so we can control the random walk
        let candlesBackward = [];
        for (let i = 0; i < intervals; i++) {
            // Random walk volatility: max 1% per 15m
            const volatility = 0.01;

            const close = currentPrice;
            // Close can be up or down
            const openChange = 1 + (Math.random() * volatility * 2 - volatility);
            const open = close * openChange;

            // High is above MAX(open, close) by up to 0.5%
            const high = Math.max(open, close) * (1 + (Math.random() * (volatility / 2)));
            // Low is below MIN(open, close) by up to 0.5%
            const low = Math.min(open, close) * (1 - (Math.random() * (volatility / 2)));

            currentPrice = open;

            candlesBackward.push({ open, high, low, close });
        }

        // Now candlesBackward[0] is 15m ago, candlesBackward[99] is 100 intervals ago.
        for (let i = 0; i < intervals; i++) {
            const timeAgo = new Date(now.getTime() - ((i + 1) * intervalMs));
            const c = candlesBackward[i];
            historyToInsert.push({
                assetId: asset.id,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                timestamp: timeAgo
            });
        }
    }

    console.log(`Generating ${historyToInsert.length} PriceHistory records...`);

    // Chunk inserts for SQLite limitations
    const chunkSize = 1000;
    for (let i = 0; i < historyToInsert.length; i += chunkSize) {
        const chunk = historyToInsert.slice(i, i + chunkSize);
        await prisma.priceHistory.createMany({
            data: chunk
        });
        console.log(`Inserted chunk ${i / chunkSize + 1}`);
    }

    console.log("Historical data generation complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
