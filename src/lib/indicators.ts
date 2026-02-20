export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface SMA {
    time: string;
    value: number;
}

/**
 * Calculates SMA for a given window size.
 * Optimized to only calculate what's needed if we were partial, 
 * but for this implementation, we'll process the whole array efficiently.
 * 
 * To strictly "memoize" and not re-calculate history on every update:
 * We would need a stateful class or closure that keeps the running sum.
 * However, since we are likely passing a full array of data each time in React props,
 * useMemo in the component is the best place to memoize the result array.
 * 
 * This helper just does the calculation.
 */
export function calculateSMA(data: Candle[], period: number): SMA[] {
    const smaData: SMA[] = [];

    if (data.length < period) return [];

    // Initial sum
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }

    smaData.push({ time: data[period - 1].time, value: sum / period });

    // Sliding window
    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period].close + data[i].close;
        smaData.push({ time: data[i].time, value: sum / period });
    }

    return smaData;
}
