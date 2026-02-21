/**
 * Generates a consistent pseudo-random offset based on a string.
 */
function getPseudoOffset(str) {
    let offset = 0;
    for (let i = 0; i < str.length; i++) {
        offset += str.charCodeAt(i);
    }
    return offset * 10000;
}

/**
 * A simple deterministic Pseudo-Random Number Generator (PRNG).
 * Given the same seed string and time, it will always return the same float between -1 and 1.
 */
function seededPRNG(seedPhrase, timeMs) {
    // Mash string and time down to a single chaotic float
    let hash = 0;
    for (let i = 0; i < seedPhrase.length; i++) {
        hash = Math.imul(31, hash) + seedPhrase.charCodeAt(i) | 0;
    }
    // Mix the time component in aggressively
    const chaoticInt = Math.sin(hash ^ timeMs) * 10000;
    // Strip it to its decimal jitter
    return chaoticInt - Math.floor(chaoticInt);
}

/**
 * Calculates a complex floating point percentage shift for an asset at a specific timestamp.
 * Integrates deterministic Brownian motion (Random Walk) with a subtle sinusoidal macro drift.
 * 
 * @param {Object} asset - The asset object containing at least `id` and `sector`
 * @param {number} timestampMs - Unix timestamp in milliseconds
 * @returns {number} - The percentage shift (e.g., 0.005 for 0.5%)
 */
export function calculatePriceShift(asset, timestampMs) {
    const assetOffset = getPseudoOffset(asset.id);
    const sectorOffset = getPseudoOffset(asset.sector || "DEFAULT");

    // 1. TRUE DETERMINISTIC BROWNIAN MOTION (The primary driver)
    // Use Box-Muller transform for a normal distribution rather than uniform noise.
    // This provides "fat tails" and realistic standard deviations.
    const u1 = seededPRNG(asset.id + "A", timestampMs);
    const u2 = seededPRNG(asset.id + "B", timestampMs);

    // Avoid log(0)
    const safeU1 = Math.max(u1, 0.000001);
    const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2);

    // Base Volatility: A standard deviation of ~0.15% per 3-minute tick.
    const randomWalkShift = z0 * 0.0015;

    // 2. MACRO TREND DRIFT (Gravity, not velocity)
    // Massive cycles act as subtle underlying biases.
    const macroCycle1 = 36 * 60 * 60 * 1000; // 36 hours
    const macroCycle2 = 72 * 60 * 60 * 1000; // 72 hours
    const macroCycle3 = 168 * 60 * 60 * 1000; // 7 days

    const macroPhase1 = ((timestampMs + assetOffset) % macroCycle1) / macroCycle1 * Math.PI * 2;
    const macroPhase2 = ((timestampMs + (assetOffset * 1.5)) % macroCycle2) / macroCycle2 * Math.PI * 2;
    const macroPhase3 = ((timestampMs + (assetOffset * 2)) % macroCycle3) / macroCycle3 * Math.PI * 2;

    // The Macro drift is microscopically tiny. Max sum is ~0.00015 (0.015% per tick).
    // Over 100 ticks (5 hours), this accumulates to ~1.5% drift, while the random walk spans roughly 1.5% variance.
    const macroDrift = (Math.sin(macroPhase1) * 0.00006) +
        (Math.sin(macroPhase2) * 0.00005) +
        (Math.sin(macroPhase3) * 0.00004);

    // 3. SECTOR TREND DRIFT
    const sectorCycle = 24 * 60 * 60 * 1000; // 24 hours
    const sectorPhase = ((timestampMs + sectorOffset) % sectorCycle) / sectorCycle * Math.PI * 2;
    const sectorDrift = Math.sin(sectorPhase) * 0.00005;

    // Combined percentage shift
    return randomWalkShift + macroDrift + sectorDrift;
}
