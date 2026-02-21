import { PrismaClient } from '@prisma/client';
import { calculatePriceShift } from './src/lib/marketMath.js';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching assets...");
    const assets = await prisma.asset.findMany();
    console.log(`Found ${assets.length} assets.`);

    const historyToInsert = [];
    const now = new Date();

    // Generate 500 points, spaced by 5 minutes each, stepping backwards
    const intervals = 500;
    const intervalMs = 5 * 60 * 1000; // 5 minutes per history point
    const subTicks = 5; // 1 minute ticks per 5 minute interval
    const tickMs = 1 * 60 * 1000;
    const cycleLength = 7200000; // 2 hour sinusoidal phase cycle

    for (const asset of assets) {
        let simulatedPrice = asset.basePrice;

        for (let i = 0; i < intervals; i++) {
            const intervalEndTime = new Date(now.getTime() - (i * intervalMs));

            let candle = {
                open: simulatedPrice,
                high: simulatedPrice,
                low: simulatedPrice,
                close: simulatedPrice
            };

            for (let j = 0; j < subTicks; j++) {
                const tickTime = intervalEndTime.getTime() - (j * tickMs);

                // Use shared math for reverse candle generation
                const priceShiftPercent = calculatePriceShift(asset, tickTime);

                // To walk *backward* in price, we divide or inverse the multiplier.
                // If moving forward: newPrice = oldPrice * (1 + shift)
                // Moving backward: oldPrice = newPrice / (1 + shift)
                simulatedPrice = simulatedPrice / (1 + priceShiftPercent);

                // Update wick tracking
                candle.high = Math.max(candle.high, simulatedPrice);
                candle.low = Math.min(candle.low, simulatedPrice);

                // If it's the very last 3-minute tick of this 15-min interval backward (meaning chronologically the first),
                // that's the open price.
                if (j === subTicks - 1) {
                    candle.open = simulatedPrice;
                }
            }

            // We must stamp the timestamp representing the *start* of the interval based on existing UI assumptions
            const intervalStartTime = new Date(intervalEndTime.getTime() - intervalMs);

            historyToInsert.push({
                assetId: asset.id,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                timestamp: intervalStartTime
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
