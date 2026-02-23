import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Run one municipal economic update.
 * 
 * 1. Settle awarded contracts (City pays supplier).
 * 2. Auto-procure essential goods for NPC cities.
 */
async function runMunicipalUpdate() {
    console.log(`[${new Date().toISOString()}] Municipal update starting...`);

    try {
        // 1. Settle Awarded Contracts
        const awardedContracts = await prisma.municipalContract.findMany({
            where: { status: 'AWARDED', awardedBidId: { not: null } },
            include: {
                awardedBid: { include: { bidder: true } },
                municipality: true,
                good: true
            }
        });

        for (const contract of awardedContracts) {
            const bid = contract.awardedBid;
            const supplier = bid.bidder;
            const city = contract.municipality;
            const totalToPay = contract.quantityRequired * bid.pricePerUnit;

            if (city.deltaReserve >= totalToPay) {
                console.log(`[Municipal] Settling contract ${contract.id} for ${city.name}. Paying ${supplier.username} Δ${totalToPay.toFixed(2)} for ${contract.quantityRequired} ${contract.good.unit}(s) of ${contract.good.name}.`);

                await prisma.$transaction(async (tx) => {
                    // Deduct from city
                    await tx.municipality.update({
                        where: { id: city.id },
                        data: { deltaReserve: { decrement: totalToPay } }
                    });
                    // Pay supplier
                    await tx.user.update({
                        where: { id: supplier.id },
                        data: { deltaBalance: { increment: totalToPay } }
                    });
                    // Record transaction
                    await tx.transaction.create({
                        data: {
                            userId: supplier.id,
                            type: 'MUNICIPAL_PAYMENT',
                            amount: totalToPay,
                            price: bid.pricePerUnit,
                            fee: 0,
                            ticker: 'MUNI',
                            description: `Contract ${contract.id} settlement for ${contract.good.name}`
                        }
                    });
                    // Mark contract as SETTLED
                    await tx.municipalContract.update({
                        where: { id: contract.id },
                        data: { status: 'SETTLED' }
                    });
                });
            } else {
                console.warn(`[Municipal] City ${city.name} has insufficient reserve (Δ${city.deltaReserve.toFixed(2)}) to settle contract ${contract.id} (Cost: Δ${totalToPay.toFixed(2)}).`);
            }
        }

        // 2. NPC City Auto-Procurement (Simplified)
        // Cities with no Mayor (mayorId is null) periodically issue contracts for essential goods if they have reserves.
        const npcCities = await prisma.municipality.findMany({
            where: { mayorId: null, deltaReserve: { gt: 1000 } }
        });

        for (const city of npcCities) {
            // Check if city already has open contracts
            const openCount = await prisma.municipalContract.count({
                where: { municipalityId: city.id, status: 'OPEN' }
            });

            if (openCount === 0 && Math.random() < 0.2) {
                // Issue a contract for clean energy or fuel
                const essentials = await prisma.good.findMany({
                    where: { name: { in: ['Clean Energy Grid', 'Hydrocarbon Fuel'] } }
                });

                if (essentials.length > 0) {
                    const target = essentials[Math.floor(Math.random() * essentials.length)];
                    const deadline = new Date();
                    deadline.setDate(deadline.getDate() + 3);

                    await prisma.municipalContract.create({
                        data: {
                            municipalityId: city.id,
                            goodId: target.id,
                            quantityRequired: 100,
                            budgetDelta: 120, // max price per unit
                            deadline,
                            status: 'OPEN'
                        }
                    });
                    console.log(`[Municipal] NPC City ${city.name} issued procurement contract for ${target.name}.`);
                }
            }
        }

        console.log(`[Municipal] Update complete.`);
    } catch (e) {
        console.error('[Municipal] Error in municipal update:', e);
    }
}

export { runMunicipalUpdate };
