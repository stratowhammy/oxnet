import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function reseedPiHistory() {
    const symbol = 'PI';
    const barCount = 300;

    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) {
        console.error(`Asset ${symbol} not found`);
        process.exit(1);
    }

    const currentPrice = asset.basePrice;
    // Start at 95% of current price to look more realistic
    const startPrice = currentPrice * 0.95;

    console.log(`Reseeding history for ${symbol}:`);
    console.log(`  Target Price: ${currentPrice}`);
    console.log(`  Starting Price: ${startPrice}`);
    console.log(`  Bars: ${barCount}`);

    // Delete existing history
    await prisma.priceHistory.deleteMany({ where: { assetId: asset.id } });
    console.log("Deleted existing price history.");

    const historyData = [];
    const now = new Date();

    // Brownian Bridge generation
    const W = [0];
    for (let i = 1; i < barCount; i++) {
        // Random standard normal (Box-Muller)
        const u1 = Math.random();
        const u2 = Math.random();
        // Avoid log(0)
        const z0 = Math.sqrt(-2.0 * Math.log(u1 === 0 ? Number.EPSILON : u1)) * Math.cos(2.0 * Math.PI * u2);
        W.push(W[i - 1] + z0);
    }
    const W_end = W[barCount - 1];

    let lastClose = startPrice;

    for (let i = 0; i < barCount; i++) {
        // Brownian bridge formula: W_B(t) = W(t) - (t/T)*W(T)
        // This gives a random walk pinned at 0 at the start and 0 at the end
        const t = i / (barCount - 1);
        const bridge = W[i] - t * W_end;

        // Scale the bridge. We want volatility to be realistic.
        const volatilityScale = currentPrice * 0.02; // max ~2% deviation from trend

        const trendPrice = startPrice + (currentPrice - startPrice) * t;
        const targetClose = trendPrice + bridge * volatilityScale;

        // Ensure price doesn't go negative or drop unreasonably
        const close = Math.max(targetClose, startPrice * 0.5);
        const open = i === 0 ? startPrice : lastClose;

        // Generate high and low based on localized volatility
        const localVol = currentPrice * 0.005 * Math.random();
        const high = Math.max(open, close) + localVol;
        const low = Math.min(open, close) - localVol;

        // Spread bars out every 15 minutes
        const timestamp = new Date(now.getTime() - (barCount - i) * 15 * 60 * 1000);

        historyData.push({
            assetId: asset.id,
            open,
            high,
            low,
            close: i === barCount - 1 ? currentPrice : close, // Pin exactly to currentPrice on last step
            timestamp
        });

        lastClose = close;
    }

    console.log(`Inserting ${historyData.length} records...`);
    await prisma.priceHistory.createMany({
        data: historyData
    });

    console.log("History reseed completed.");
}

reseedPiHistory()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
