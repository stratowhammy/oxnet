import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function generateReport() {
    console.log("Fetching all assets and portfolios...");

    const assets = await prisma.asset.findMany({
        include: {
            portfolios: true
        }
    });

    let csvContent = "Symbol,Name,Sector,Niche,Base Price,AMM Supply Pool,User Longs,Total Outstanding Shares,Market Cap\n";

    for (const asset of assets) {
        let userHoldings = 0;

        for (const p of asset.portfolios) {
            if (!p.isShortPosition) {
                userHoldings += p.quantity;
            }
            // Short positions represent borrowed shares that were sold. 
            // The person who bought them holds the 'long', which is counted.
        }

        const totalOutstanding = asset.supplyPool + userHoldings;
        const marketCap = totalOutstanding * asset.basePrice;

        csvContent += `"${asset.symbol}","${asset.name}","${asset.sector}","${asset.niche}",${asset.basePrice.toFixed(2)},${asset.supplyPool.toFixed(2)},${userHoldings.toFixed(2)},${totalOutstanding.toFixed(2)},${marketCap.toFixed(2)}\n`;
    }

    fs.writeFileSync('marketcap_report.csv', csvContent);
    console.log("Successfully wrote marketcap_report.csv");
}

generateReport()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
