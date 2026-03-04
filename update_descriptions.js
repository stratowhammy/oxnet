import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const FIRST_NAMES = ["Alexander", "Victoria", "Julian", "Marcus", "Elena", "Sophia", "David", "Artemis", "Chen", "Olivia", "Omar", "Aisha"];
const LAST_NAMES = ["Vance", "Sterling", "Cross", "Mercer", "Blackwood", "Sato", "Al-Fayed", "Kovac", "Holloway", "Chen", "Ramirez"];
const TRAITS = [
    "known for ruthless cost-cutting and aggressive expansion",
    "a visionary futurist who often ignores short-term profits",
    "a highly technical leader obsessed with micro-optimizations",
    "a charismatic dealmaker with deep political connections",
    "a secretive workaholic who rarely makes public appearances",
    "a former hedge-fund manager ruthlessly focused on shareholder value",
    "a populist leader beloved by retail investors but hated by institutions",
    "an eccentric genius prone to unpredictable strategic pivots",
    "a steady, conservative operator who prioritizes risk management",
    "a firebrand who openly mocks competitors and regulators alike"
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const templates = [
    (name, niche, ceo, trait, depsText) => `${name} is the premier operator in the ${niche} space. At the helm is CEO ${ceo}, ${trait}. The firm's operations are deeply intertwined with ${depsText}.`,
    (name, niche, ceo, trait, depsText) => `Pioneering advancements in ${niche}, ${name} remains a highly watched entity. Chief Executive ${ceo} leads the charge, functioning as ${trait}. Strategic dependencies include ${depsText}.`,
    (name, niche, ceo, trait, depsText) => `Specializing exclusively in ${niche}, ${name} has built a massive industrial footprint. The company is guided by ${ceo}, widely regarded as ${trait}. Supply chain links inextricably connect them to ${depsText}.`,
    (name, niche, ceo, trait, depsText) => `Operating at the bleeding edge of ${niche}, ${name} pushes boundaries daily. Direction is set by CEO ${ceo}, ${trait}. Market conditions for them closely mirror those of ${depsText}.`,
    (name, niche, ceo, trait, depsText) => `As a global powerhouse touching ${niche}, ${name} maintains absolute market dominance. Leadership falls to ${ceo}, ${trait}. They rely heavily on the performance and outputs of ${depsText}.`
];

async function updateDescriptions() {
    console.log("Fetching all assets...");
    const assets = await prisma.asset.findMany({ where: { symbol: { not: 'DELTA' } } });

    const interDepPath = path.join(process.cwd(), 'src/lib/interdependence.json');
    let interdependence = {};
    if (fs.existsSync(interDepPath)) {
        interdependence = JSON.parse(fs.readFileSync(interDepPath, 'utf8'));
    }

    // Map ID -> Symbol for easy lookup
    const idToSymbol = {};
    const symbolToName = {};
    assets.forEach(a => {
        idToSymbol[a.id] = a.symbol;
        symbolToName[a.symbol] = a.name;
    });

    console.log("Generating unique lore...");
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        const ceoName = `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`;
        const trait = getRandomItem(TRAITS);

        const deps = interdependence[asset.symbol] || [];
        let depsText = "several unlisted entities";
        if (deps.length > 0) {
            depsText = deps.map(d => symbolToName[d.symbol] ? `${symbolToName[d.symbol]} (${d.symbol})` : d.symbol).join(' and ');
        }

        const template = templates[i % templates.length];
        // Ensure absolutely no repeating first lines or repeating lines overall
        // By injecting the exact company name, niche, CEO name, trait, and deps differently each time,
        // and using a slightly changing sentence structure, we avoid repetition.
        // We will also add a unique identifier sentence just in case.
        const baseDesc = template(asset.name, asset.niche, ceoName, trait, depsText);
        const uniqueDesc = `${baseDesc} Ticker symbol ${asset.symbol} serves as the primary gauge of their success.`;

        await prisma.asset.update({
            where: { id: asset.id },
            data: { description: uniqueDesc }
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
