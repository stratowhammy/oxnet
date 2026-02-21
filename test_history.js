const now = new Date().getTime();
const intervalMs = 15 * 60 * 1000; // 15 minutes
const tickMs = 3 * 60 * 1000;
const cycleLength = 7200000; // 2 hour

let simulatedPrice = 100;
const historyToInsert = [];
const pseudoRandomOffset = 1000; // arbitrary

for (let i = 0; i < 10; i++) {
    const intervalEndTime = now - (i * intervalMs);

    let candle = {
        open: simulatedPrice,
        high: simulatedPrice,
        low: simulatedPrice,
        close: simulatedPrice
    };

    for (let j = 0; j < 5; j++) {
        const tickTime = intervalEndTime - (j * tickMs);
        const phase = ((tickTime + (pseudoRandomOffset * 10000)) % cycleLength) / cycleLength * Math.PI * 2;
        const priceShiftPercent = Math.sin(phase) * 0.005;

        simulatedPrice = simulatedPrice / (1 + priceShiftPercent);

        candle.high = Math.max(candle.high, simulatedPrice);
        candle.low = Math.min(candle.low, simulatedPrice);

        if (j === 4) {
            candle.open = simulatedPrice;
        }
    }

    const intervalStartTime = intervalEndTime - intervalMs;
    historyToInsert.push({
        i,
        timestamp: new Date(intervalStartTime).toISOString(),
        open: candle.open,
        close: candle.close,
        phaseStart: ((intervalEndTime - 4 * tickMs + (pseudoRandomOffset * 10000)) % cycleLength) / cycleLength * Math.PI * 2
    });
}

console.log(historyToInsert.reverse());
