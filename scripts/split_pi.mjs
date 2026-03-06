import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runSplit() {
    console.log("Starting Pi Asset Split Operation...");

    const pi = await prisma.asset.findFirst({
        where: { name: { contains: 'Pi' } },
        include: { portfolios: true }
    });

    if (!pi) {
        console.error("Pi asset not found!");
        return;
    }

    // Current total shares is exactly 3 (supplyPool + portfolio positions)
    // Target total shares: 314,159,265
    // Split Ratio: Target / Current
    const SPLIT_RATIO = 314159265 / 3;

    console.log(`Split Ratio: ${SPLIT_RATIO} : 1`);
    console.log(`Current Base Price: Δ${pi.basePrice}`);

    const newBasePrice = pi.basePrice / SPLIT_RATIO;
    const newSupplyPool = pi.supplyPool * SPLIT_RATIO;
    const newDemandPool = (newSupplyPool * pi.demandPool) / pi.supplyPool; // Maintain K if needed, but price is directly adjusted.
    // Actually, k = supply * demand. Price = demand / supply.
    // If supply * ratio, and price / ratio, then newDemand = newPrice * newSupply
    // = (Price/Ratio) * (Supply*Ratio) = Price * Supply = old Demand!
    // So demandPool actually stays exactly the same, only supplyPool scales up.

    // Let's verify:
    // oldPrice = oldDemand / oldSupply
    // newPrice = oldDemand / (oldSupply * Ratio) = (oldDemand / oldSupply) / Ratio = oldPrice / Ratio. Correct.

    console.log(`New Base Price: Δ${newBasePrice}`);

    // Begin Transaction
    const txOps = [];

    // 1. Update Asset
    txOps.push(prisma.asset.update({
        where: { id: pi.id },
        data: {
            basePrice: newBasePrice,
            supplyPool: newSupplyPool,
            // demandPool stays identical to keep Price = Demand / Supply accurate
        }
    }));

    // 2. Update Portfolios
    for (const p of pi.portfolios) {
        txOps.push(prisma.portfolio.update({
            where: { id: p.id },
            data: {
                quantity: p.quantity * SPLIT_RATIO,
                averageEntryPrice: p.averageEntryPrice / SPLIT_RATIO,
                liquidationPrice: p.liquidationPrice ? p.liquidationPrice / SPLIT_RATIO : null,
                takeProfitPrice: p.takeProfitPrice ? p.takeProfitPrice / SPLIT_RATIO : null,
                stopLossPrice: p.stopLossPrice ? p.stopLossPrice / SPLIT_RATIO : null,
                // loanAmount stays the same (notional value didn't change)
                // accruedInterest stays the same
            }
        }));
    }

    // 3. Clear Old Price History
    txOps.push(prisma.priceHistory.deleteMany({
        where: { assetId: pi.id }
    }));

    console.log("Executing DB modifications...");
    await prisma.$transaction(txOps);

    // 4. Generate New Price History (600 Candles)
    console.log("Generating 600 new price history candles...");

    const BARS_TO_GENERATE = 600;
    const INTERVAL_MS = 15 * 60 * 1000;
    const now = Date.now();
    const historyData = [];

    let currentPrice = newBasePrice;
    const prices = [];

    for (let i = 0; i < BARS_TO_GENERATE; i++) {
        const volatility = 0.005;
        const move = 1 + (Math.random() - 0.5) * 2 * volatility;
        const open = currentPrice;
        const close = open * move;
        const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

        prices.push({ open, high, low, close });
        currentPrice = close;
    }

    const lastClose = prices[prices.length - 1].close;
    const correctionFactor = newBasePrice / lastClose;

    const normalizedPrices = prices.map(p => ({
        open: p.open * correctionFactor,
        high: p.high * correctionFactor,
        low: p.low * correctionFactor,
        close: p.close * correctionFactor,
    }));

    for (let i = 0; i < BARS_TO_GENERATE; i++) {
        const timestamp = new Date(now - ((BARS_TO_GENERATE - 1 - i) * INTERVAL_MS));
        historyData.push({
            assetId: pi.id,
            open: normalizedPrices[i].open,
            high: normalizedPrices[i].high,
            low: normalizedPrices[i].low,
            close: normalizedPrices[i].close,
            timestamp
        });
    }

    await prisma.priceHistory.createMany({ data: historyData });

    console.log("Operation Complete. Validating changes...");
    const updatedPi = await prisma.asset.findUnique({ where: { id: pi.id } });
    const updatedPorts = await prisma.portfolio.findMany({ where: { assetId: pi.id } });

    console.log(`Updated Supply Pool: ${updatedPi.supplyPool}`);
    console.log(`Updated Base Price: ${updatedPi.basePrice}`);
    if (updatedPorts.length > 0) {
        console.log(`Example updated portfolio quantity: ${updatedPorts[0].quantity} (Entry: ${updatedPorts[0].averageEntryPrice})`);
    }

}

runSplit().catch(e => {
    console.error("Script failed:", e);
}).finally(() => {
    prisma.$disconnect();
});
