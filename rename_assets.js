const fs = require('fs');

const seedContent = fs.readFileSync('prisma/seed.ts', 'utf-8');

const startIdx = seedContent.indexOf('const assetsData = [');
const endIdx = seedContent.lastIndexOf('];', seedContent.indexOf('async function main()'));

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find assetsData array.");
    process.exit(1);
}

const arrayStr = seedContent.substring(startIdx + 19, endIdx + 1);

let assets;
try {
    assets = eval('(' + arrayStr + ')');
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

const usedNames = new Set();
const usedSymbols = new Set();

function generateName(niche, sector) {
    const words = niche.replace(/[^a-zA-Z]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    let name = words.length > 0 ? words[0] : sector;
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    // Some tech-sounding names for companies
    const prefixes = ['Aero', 'Bio', 'Cyber', 'Data', 'Eco', 'Fin', 'Health', 'Inno', 'Nano', 'Omni', 'Poly', 'Quantum', 'Robo', 'Synthe', 'Terra', 'Xeno', 'Zephyr', 'Orion', 'Lyra', 'Apex', 'Nexus', 'Vertex', 'Hyper', 'Macro'];

    if (words.length === 0) {
        name = prefixes[Math.floor(Math.random() * prefixes.length)];
    }

    const suffixes = ['Systems', 'Dynamics', 'Technologies', 'Innovations', 'Solutions', 'Holdings', 'Ventures', 'Labs', 'Network', 'Corp', 'Inc', 'Group', 'Partners', 'Industries'];
    let suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    let baseName = name;
    let finalName = `${baseName} ${suffix}`;

    let i = 1;
    while (usedNames.has(finalName)) {
        let prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        finalName = `${prefix}${baseName} ${suffix}`;
        if (usedNames.has(finalName)) {
            finalName = `${prefix}${baseName}${i} ${suffix}`;
            i++;
        }
    }
    usedNames.add(finalName);
    return finalName;
}

function generateSymbol(name) {
    let sym = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (sym.length > 4) sym = sym.substring(0, 4);
    if (sym.length < 3) sym = sym.padEnd(3, 'X');

    let finalSym = sym;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let attempts = 0;
    while (usedSymbols.has(finalSym)) {
        finalSym = sym.substring(0, 3) + chars.charAt(Math.floor(Math.random() * 26));
        attempts++;
        if (attempts > 50) {
            finalSym = chars.charAt(Math.floor(Math.random() * 26)) + chars.charAt(Math.floor(Math.random() * 26)) + chars.charAt(Math.floor(Math.random() * 26));
        }
    }
    usedSymbols.add(finalSym);
    return finalSym;
}

const sectorMap = {
    'Technology': 'Technology',
    'Healthcare': 'Healthcare',
    'Energy': 'Energy',
    'Finance': 'Finance',
    'Consumer': 'Consumer & Retail',
    'Space': 'Industrials',
    'Transport': 'Industrials',
    'Real Estate': 'Real Estate',
    'Government': 'Government Bonds',
    'Corporate': 'Corporate Bonds',
    'Precious Metals': 'Commodities',
    'Industrial': 'Commodities',
    'Agriculture': 'Commodities',
    'Currency': 'Digital Assets & FX',
    'Materials': 'Materials',
    'Education': 'Consumer & Retail',
    'Services': 'Services',
    'Crypto': 'Digital Assets & FX',
    'Media': 'Media & Telecom',
    'Utilities': 'Utilities',
    'Infrastructure': 'Industrials',
    'Manufacturing': 'Industrials',
};

assets.forEach(asset => {
    // Basic assignment
    if (sectorMap[asset.sector]) {
        asset.sector = sectorMap[asset.sector];
    } else {
        asset.sector = 'Other';
    }

    if (asset.type === 'STOCK') {
        asset.name = generateName(asset.niche || asset.sector, asset.sector);
        asset.symbol = generateSymbol(asset.name);
    } else {
        // Just make sure non-stocks have unique symbols too
        let sym = asset.symbol;
        if (sym.includes('-')) {
            sym = sym.replace('-', '').substring(0, 4);
        }
        let finalSym = sym;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let attempts = 0;
        while (usedSymbols.has(finalSym)) {
            finalSym = sym.substring(0, 3) + chars.charAt(Math.floor(Math.random() * 26));
            attempts++;
            if (attempts > 50) {
                finalSym = chars.charAt(Math.floor(Math.random() * 26)) + chars.charAt(Math.floor(Math.random() * 26)) + chars.charAt(Math.floor(Math.random() * 26));
            }
        }
        asset.symbol = finalSym;
        usedSymbols.add(finalSym);
        usedNames.add(asset.name);
    }
});

const counts = {};
assets.forEach(a => counts[a.sector] = (counts[a.sector] || 0) + 1);
console.log("Sector Counts:", counts);

// Now re-serialize
function stringifyObject(obj) {
    let str = '    {\n';
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            str += `        ${key}: ${JSON.stringify(obj[key])},\n`;
        } else {
            str += `        ${key}: ${obj[key]},\n`;
        }
    }
    str += '    }';
    return str;
}

const newArrayStr = '[\n' + assets.map(stringifyObject).join(',\n') + '\n]';

const newSeedContent = seedContent.substring(0, startIdx + 19) + newArrayStr + seedContent.substring(endIdx + 1);

fs.writeFileSync('prisma/seed.ts', newSeedContent, 'utf-8');
console.log("Successfully updated prisma/seed.ts!");
