import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Run one full labour market update.
 * 
 * 1. Calculate average wages per sector.
 * 2. Move workers from low-wage to high-wage companies.
 * 3. Update strike status based on wage gap.
 */
async function runLabourMarketUpdate() {
    console.log(`[${new Date().toISOString()}] Labour market update starting...`);

    try {
        const facilities = await prisma.productionFacility.findMany({
            include: { asset: true }
        });

        if (facilities.length === 0) return;

        // 1. Calculate Average Wages per Sector
        const sectorWages = {};
        for (const f of facilities) {
            const sector = f.asset.sector;
            if (!sectorWages[sector]) sectorWages[sector] = { total: 0, count: 0 };
            sectorWages[sector].total += f.wages;
            sectorWages[sector].count += 1;
        }

        const averages = {};
        for (const sector in sectorWages) {
            averages[sector] = sectorWages[sector].total / sectorWages[sector].count;
        }

        // 2. Migration & Strikes
        for (const f of facilities) {
            const sectorAvg = averages[f.asset.sector];
            const wageRatio = f.wages / sectorAvg;

            // MIGRATION LOGIC
            let headcountDelta = 0;
            if (wageRatio > 1.1) {
                // High wages attract workers (limit to maxCapacity)
                headcountDelta = Math.floor(Math.random() * 3) + 1;
            } else if (wageRatio < 0.9) {
                // Low wages lose workers
                headcountDelta = -(Math.floor(Math.random() * 3) + 1);
            }

            const newHeadcount = Math.max(0, Math.min(f.maxCapacity, f.headcount + headcountDelta));

            // STRIKE LOGIC
            let strikeStatus = f.onStrike;
            if (wageRatio < 0.8) {
                // High risk of strike if wages are >20% below average
                if (Math.random() < 0.1) strikeStatus = true;
            } else if (wageRatio > 1.0) {
                // Strike ends if wages are competitive
                if (Math.random() < 0.3) strikeStatus = false;
            }

            // Update facility
            await prisma.productionFacility.update({
                where: { id: f.id },
                data: {
                    headcount: newHeadcount,
                    onStrike: strikeStatus
                }
            });

            if (headcountDelta !== 0) {
                console.log(`[Labour] ${f.asset.symbol} headcount: ${f.headcount} -> ${newHeadcount} (${headcountDelta > 0 ? '+' : ''}${headcountDelta})`);
            }
            if (strikeStatus !== f.onStrike) {
                console.log(`[Labour] ${f.asset.symbol} strike status: ${strikeStatus ? 'STARTED' : 'ENDED'}`);
            }
        }

        console.log(`[Labour] Market update complete.`);
    } catch (e) {
        console.error('[Labour] Error in labour market update:', e);
    }
}

export { runLabourMarketUpdate };
