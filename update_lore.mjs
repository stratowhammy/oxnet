import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateCEO = (symbol) => {
    const names = ["Alexander", "Beatrice", "Charles", "Diana", "Edward", "Fiona", "George", "Helen", "Ian", "Julia", "Karl", "Laura", "Marcus", "Nina", "Oliver", "Penelope", "Quincy", "Rachel", "Stephen", "Theresa", "Ulysses", "Victoria", "William", "Xena", "Yusuf", "Zara"];
    const lasts = ["Smith", "Chen", "Patel", "Rodriguez", "Kim", "O'Connor", "Muller", "Ivanov", "Dubois", "Rossi", "Silva", "Kowalski", "Johansson", "Papadopoulos", "Wong", "Ali", "Gomez", "Cohen", "Nguyen", "Sato"];
    const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return names[hash % names.length] + ' ' + lasts[(hash * 3) % lasts.length];
};

const expandNarrative = (asset, ceoName) => {
    const orig = asset.description || '';
    const part1 = `${asset.name} operates extensively within the [${asset.sector}](/?search=${encodeURIComponent(asset.sector)}) sector, maintaining a robust business model designed to navigate complex macroeconomic headwinds. `;
    const part2 = `The firm's strategic operations are driven by a distinct specialization in ${asset.niche}, which serves as a core catalyst for revenue growth and long-term shareholder value. `;
    const part3 = `Under the decisive leadership of CEO ${ceoName}, the organization is focused on cementing its market position through aggressive operational efficiency and disciplined capital allocation. `;
    const part4 = `Building upon its foundational model: ${orig} `;
    const part5 = `Going forward, management expects this targeted approach to yield compounding advantages, mitigating downside risks.`;
    return part1 + part2 + part3 + part4 + part5;
};

const fiatLore = {
    'DELTA': {
        leader: 'High Chancellor Vok',
        desc: "The Delta serves as the primary reserve currency of the global federation, establishing the baseline for macro-economic stability across interconnected markets. Under the steadfast administration of High Chancellor Vok, this fiat instrument is carefully managed to balance inflation targets against the liquidity demands of an expanding civilization. The central banking authority governing the Delta relies on algorithmic yield curve controls and expansive gold reserves to maintain faith in its purchasing power. Trading volumes reflect its status as the supreme unit of account, facilitating trillions in daily transactional flow while acting as the ultimate safe haven during periods of acute financial distress and market volatility."
    },
    'VALR': {
        leader: 'Premier Aris Thorne',
        desc: "The Valerian Mark is the sovereign fiat of the Valerian Union, representing the collective industrial might of its member states. Guided by the conservative fiscal policies of Premier Aris Thorne, the Mark rivals global reserve currencies through its strict supply constraints and massive commodity backing. The Union's central bank prioritizes long-term purchasing power over short-term stimulus, making the Mark a preferred store of value for multi-generational wealth funds. Its resilience during systemic shocks highlights the structural integrity of the Valerian economy, ensuring continuous demand in forex markets as investors seek shelter from the inflation volatility prevalent in neighboring financial jurisdictions."
    },
    'ZEN': {
        leader: 'Shogun Kaito',
        desc: "The Zen Yen operates as a critical low-yield safe haven in the international monetary system, underpinned by the disciplined governance of Shogun Kaito and the Imperial Reserve. Historically utilized as the premier funding currency for global carry trades, its suppressed interest rates allow aggressive capital to flow outward into risk-on assets. However, during periods of heightened uncertainty, the rapid repatriation of capital aggressively drives up its valuation, punishing over-leveraged speculators. The Shogun's administration meticulously controls this dynamic, deploying swift market interventions to prevent excessive currency appreciation from damaging the export-driven sectors that form the backbone of their domestic economy."
    },
    'AURE': {
        leader: 'Monarch Elara V',
        desc: "Steeped in centuries of financial tradition, the Aurelius Pound stands as the oldest continuous fiat currency in active circulation. Overseen by Monarch Elara V, the Pound maintains a formidable presence in the Great Hub trading zones, leveraging deep institutional trust built over generations of unbroken debt repayment. While it has ceded its status as the absolute global reserve, its deep liquidity pools and premium yields continue to attract sophisticated institutional capital. The royal treasury employs a dual-mandate of historical prestige and modern algorithmic balancing, striving to keep the Pound relevant and robust in an increasingly digitized and volatile macroeconomic environment."
    },
    'BASE': {
        leader: 'Chairman Silas Vance',
        desc: "The Base Franc is the cornerstone of the world's most secretive and secure banking haven, physically and economically anchored in the impenetrable Alpine Base. Directed by Chairman Silas Vance, the Franc represents absolute fiscal neutrality, completely decoupled from the geopolitical conflicts that routinely destabilize neighboring state currencies. Backed by opaque but supposedly limitless subterranean bullion reserves, it offers an ultimate flight-to-safety asset for ultra-high-net-worth entities. The strict capital controls and absolute privacy laws enacted by Chairman Vance guarantee that the Franc remains immune to external sanctions, ensuring its perpetual demand among clients requiring absolute financial discretion and capital preservation."
    }
};

async function main() {
    console.log("Fetching assets...");
    const assets = await prisma.asset.findMany();

    // Create CEOs for all non-currency companies
    for (const asset of assets) {
        if (asset.type !== 'CURRENCY') {
            const ceoName = generateCEO(asset.symbol);

            // Re-seed original descriptions if they were already morphed
            // Read from original definitions if possible, but fallback to replace if it already has standard template
            let cleanDesc = asset.description;
            if (cleanDesc.includes("operates extensively within")) {
                // Try to extract original from part4
                const match = cleanDesc.match(/Building upon its foundational model: (.*?) Going forward/);
                if (match) cleanDesc = match[1].trim();
            }

            const newDesc = expandNarrative({ ...asset, description: cleanDesc }, ceoName);

            await prisma.asset.update({
                where: { id: asset.id },
                data: { description: newDesc }
            });

            // Upsert NPC
            await prisma.nPC.upsert({
                where: { name: ceoName },
                update: {
                    title: 'CEO',
                    institution: asset.name,
                    category: asset.sector
                },
                create: {
                    name: ceoName,
                    title: 'CEO',
                    institution: asset.name,
                    category: asset.sector
                }
            });
            console.log(`Updated ${asset.symbol} and created CEO ${ceoName}`);
        } else {
            // CURRENCY
            if (fiatLore[asset.symbol]) {
                const lore = fiatLore[asset.symbol];
                await prisma.asset.update({
                    where: { id: asset.id },
                    data: { description: lore.desc }
                });

                await prisma.nPC.upsert({
                    where: { name: lore.leader },
                    update: {
                        title: 'State Leader',
                        institution: asset.name,
                        category: 'Government'
                    },
                    create: {
                        name: lore.leader,
                        title: 'State Leader',
                        institution: asset.name,
                        category: 'Government'
                    }
                });
                console.log(`Updated FIAT ${asset.symbol} and created Leader ${lore.leader}`);
            }
        }
    }
    console.log("Lore and NPC update complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
