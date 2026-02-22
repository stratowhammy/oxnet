const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const prefixes = [
    'Apex', 'Nova', 'Synergy', 'Quantum', 'Aether', 'Zenith', 'Echo', 'Lumina',
    'Vertex', 'Pulse', 'Stratos', 'Vanguard', 'Pinnacle', 'Horizon', 'Catalyst'
];

async function main() {
    console.log("Starting Omni asset migration...");
    const assets = await prisma.asset.findMany({
        where: {
            symbol: {
                startsWith: 'O-'
            }
        }
    });

    console.log(`Found ${assets.length} assets starting with 'O-'.`);

    for (const asset of assets) {
        // Randomly pick a new prefix
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const newPrefixFirstLetter = randomPrefix.charAt(0).toUpperCase();

        // Omni-Nexus Corp -> Apex-Nexus Corp
        let newName = asset.name.replace(/^Omni-/i, `${randomPrefix}-`);
        // O-NEX -> A-NEX
        let newSymbol = asset.symbol.replace(/^O-/i, `${newPrefixFirstLetter}-`);

        // Handle rare collisions by appending a random digit or character if needed, 
        // but for this dataset it's extremely unlikely to have identical post-hyphen strings 
        // get the same random prefix.

        try {
            await prisma.asset.update({
                where: { id: asset.id },
                data: {
                    name: newName,
                    symbol: newSymbol
                }
            });
            console.log(`Updated: ${asset.symbol} -> ${newSymbol} | ${asset.name} -> ${newName}`);
        } catch (e) {
            console.error(`Failed to update ${asset.symbol}:`, e.message);
        }
    }

    console.log("Migration complete.");
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
