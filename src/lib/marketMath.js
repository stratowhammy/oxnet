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
 * Integrates Macro Market trends, Sector specific trends, and Asset specific noise.
 * 
 * @param {Object} asset - The asset object containing at least `id` and `sector`
 * @param {number} timestampMs - Unix timestamp in milliseconds
 * @returns {number} - The percentage shift (e.g., 0.005 for 0.5%)
 */
export function calculatePriceShift(asset, timestampMs) {
    const assetOffset = getPseudoOffset(asset.id);
    const sectorOffset = getPseudoOffset(asset.sector || "DEFAULT");

    // 1. Macro Market Trend (Now individually offset by the Asset's ID to break synchronization)
    // Composed of 3 intersecting sine waves to create complex, non-repeating noise
    const macroCycle1 = 1 * 60 * 60 * 1000; // 1 hour
    const macroCycle2 = 2.5 * 60 * 60 * 1000; // 2.5 hours
    const macroCycle3 = 4 * 60 * 60 * 1000; // 4 hours

    // Applying assetOffset fundamentally shatters the "everything moves at the same hour" problem
    const macroPhase1 = ((timestampMs + assetOffset) % macroCycle1) / macroCycle1 * Math.PI * 2;
    const macroPhase2 = ((timestampMs + (assetOffset * 1.5)) % macroCycle2) / macroCycle2 * Math.PI * 2;
    const macroPhase3 = ((timestampMs + (assetOffset * 2)) % macroCycle3) / macroCycle3 * Math.PI * 2;

    // Base market drift (max ~0.2% shift)
    const macroShift = (Math.sin(macroPhase1) * 0.0008) +
        (Math.sin(macroPhase2) * 0.0008) +
        (Math.sin(macroPhase3) * 0.0004);

    // 2. Sector Trend
    const sectorCycle = 3 * 60 * 60 * 1000; // 3 hours
    const sectorPhase = ((timestampMs + sectorOffset) % sectorCycle) / sectorCycle * Math.PI * 2;

    // Sector drift (max ~0.2% shift)
    const sectorShift = Math.sin(sectorPhase) * 0.002;

    // 3. Asset Fast Noise (Creates distinct 15-30min aggressive wicks and reversals on the asset)
    const assetCycleFast = 0.5 * 60 * 60 * 1000; // 30 mins
    const assetPhaseFast = ((timestampMs + assetOffset) % assetCycleFast) / assetCycleFast * Math.PI * 2;
    const assetShiftFast = Math.sin(assetPhaseFast) * 0.003;

    // 4. Deterministic Brownian Jitter
    // Every single tick is subjected to perfectly reproducible localized static noise
    // seededPRNG returns [0, 1). Math will shift this from -.002 to +.002 (up to 0.2% static jitter per tick)
    const rawJitter = seededPRNG(asset.id, timestampMs);
    const staticBrownianShift = (rawJitter * 0.004) - 0.002;

    // Combined complex percentage shift: extremely chaotic, unpredictable, but mathematically connected.
    return macroShift + sectorShift + assetShiftFast + staticBrownianShift;
}
