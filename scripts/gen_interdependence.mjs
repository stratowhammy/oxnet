import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateInterdependence() {
    const assets = await prisma.asset.findMany({
        where: { symbol: { not: 'DELTA' } },
        select: { symbol: true, sector: true }
    });

    const map = {};

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        
        // Pick at least 2 random assets (excluding self)
        const others = assets.filter(a => a.symbol !== asset.symbol);
        
        // Pick 2 to 4 dependencies
        const numDeps = Math.floor(Math.random() * 3) + 2; 
        
        map[asset.symbol] = [];
        
        for (let j = 0; j < numDeps; j++) {
            if (others.length === 0) break;
            const randIndex = Math.floor(Math.random() * others.length);
            const dep = others.splice(randIndex, 1)[0];
            
            // Weight between 0.1 and 0.3 for organic cascading
            const weight = (Math.random() * 0.2 + 0.1).toFixed(3);
            
            map[asset.symbol].push({
                symbol: dep.symbol,
                weight: parseFloat(weight)
            });
        }
    }

    fs.writeFileSync('./src/lib/interdependence.json', JSON.stringify(map, null, 2));
    console.log('Interdependence map generated at src/lib/interdependence.json');
}

generateInterdependence()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
