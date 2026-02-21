import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIAT_LORE = [
    "Issued by a neutral banking haven, this currency benefits from strict banking secrecy laws and a stable, highly educated populace.",
    "The primary economic unit of the Valerian Union, a sprawling coalition of states struggling with internal political friction but backed by massive industrial output.",
    "A legacy fiat currency suffering from decades of quantitative easing, now buoyed primarily by its historical status and military hegemony.",
    "An emerging market currency experiencing rapid inflation, tied closely to the export of essential bio-engineered agricultural products.",
    "A highly digitized state currency with absolute surveillance capabilities, offering instant settlement but enforcing strict capital controls."
];

const CRYPTO_LORE = [
    "Utilizes a novel Proof-of-Space-Time consensus algorithm combined with Zero-Knowledge Rollups, achieving infinite scalability at the cost of high initial node setup.",
    "A privacy-focused protocol using ring signatures and stealth addresses to completely obfuscate transaction history from all forensic analysis.",
    "A Layer 3 interoperability bridge that mathematically guarantees cross-chain swaps without relying on centralized liquidity pools.",
    "An experimental smart-contract platform driven by an integrated AI oracle that autonomously adjusts gas fees based on network sentiment.",
    "A meme-origin token that accidentally achieved widespread adoption after an algorithm error caused it to become the sole currency of a popular virtual metaverse."
];

const GENERIC_LORE = [
    "A major player in its specific sector, known for aggressive M&A strategies and consistent, albeit unexciting, quarterly dividends.",
    "An innovative disruptor struggling to capture market share from entrenched incumbents, currently burning through significant venture capital.",
    "A heavily regulated entity operating critical infrastructure, offering a slow-growth profile but serving as a dependable portfolio anchor.",
    "A highly volatile speculative venture heavily dependent on favorable regulatory changes and unproven technological breakthroughs.",
    "A sprawling conglomerate with a diversified product line, currently undergoing a massive internal restructuring to improve profit margins."
];

async function updateDescriptions() {
    console.log("Fetching all assets...");
    const assets = await prisma.asset.findMany();

    let fiatIndex = 0;
    let cryptoIndex = 0;
    let genericIndex = 0;

    console.log("Imbuing assets with lore...");
    for (const asset of assets) {
        let newDescription = "";

        if (asset.sector === 'Fiat' || asset.sector === 'Currency') {
            newDescription = FIAT_LORE[fiatIndex % FIAT_LORE.length];
            fiatIndex++;
        } else if (asset.sector === 'Crypto') {
            newDescription = CRYPTO_LORE[cryptoIndex % CRYPTO_LORE.length];
            cryptoIndex++;
        } else {
            // Give standard corporate/other assets a generic but flavorful description
            newDescription = GENERIC_LORE[genericIndex % GENERIC_LORE.length];
            genericIndex++;
        }

        // Add a touch of specific flavor based on the asset's niche
        newDescription += ` Known for: ${asset.niche.toLowerCase()}.`;

        await prisma.asset.update({
            where: { id: asset.id },
            data: { description: newDescription }
        });
    }

    console.log("Successfully updated all asset descriptions!");
}

updateDescriptions()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
