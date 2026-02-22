const fs = require('fs');
let data = fs.readFileSync('prisma/seed.ts', 'utf8');

const prefixes = [
    'Apex', 'Nova', 'Synergy', 'Quantum', 'Aether', 'Zenith', 'Echo', 'Lumina',
    'Vertex', 'Pulse', 'Stratos', 'Vanguard', 'Pinnacle', 'Horizon', 'Catalyst'
];

data = data.replace(/name: 'Omni-([a-zA-Z0-9]+)/g, () => {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `name: '${p}-$1`;
});

data = data.replace(/symbol: 'O-([a-zA-Z0-9]+)/g, () => {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `symbol: '${p.charAt(0)}-$1`;
});

fs.writeFileSync('prisma/seed.ts', data);
console.log("Seed updated");
