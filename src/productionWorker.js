import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTION_CYCLE_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Run one full production cycle for all companies.
 *
 * For each Asset that has InputRequirements:
 *   1. Check if GoodInventory has enough of each input.
 *   2. If ALL inputs satisfied: produce goods, deduct inputs, boost price.
 *   3. If ANY input is missing: halt production, apply a negative price shock.
 *
 * For companies that produce a Good but have no InputRequirements:
 *   - Production always succeeds (raw material producers).
 */
async function runProductionCycle() {
    const now = new Date().toISOString();
    console.log(`[${now}] Production cycle starting...`);

    try {
        // Fetch all assets that produce a good
        const producers = await prisma.asset.findMany({
            where: { producedGoods: { some: {} } },
            include: {
                producedGoods: true,
                inputRequirements: {
                    include: { inputGood: true }
                },
                goodInventories: {
                    include: { good: true }
                }
            }
        });

        for (const company of producers) {
            const outputGood = company.producedGoods[0];
            if (!outputGood) continue;

            const inputs = company.inputRequirements;
            let canProduce = true;
            const shortfalls = [];

            // Check if all inputs are satisfied
            for (const req of inputs) {
                const inv = company.goodInventories.find(i => i.goodId === req.inputGoodId);
                const onHand = inv?.quantity ?? 0;
                if (onHand < req.unitsPerCycle) {
                    canProduce = false;
                    shortfalls.push(`${req.inputGood.name} (need ${req.unitsPerCycle}, have ${onHand.toFixed(1)})`);
                }
            }

            if (canProduce) {
                // Deduct inputs
                for (const req of inputs) {
                    const inv = company.goodInventories.find(i => i.goodId === req.inputGoodId);
                    if (inv) {
                        await prisma.goodInventory.update({
                            where: { id: inv.id },
                            data: { quantity: { decrement: req.unitsPerCycle } }
                        });
                    }
                }

                // Add output units
                const unitsProduced = outputGood.currentStockLevel <= 1000 ? 100 : 50; // Slow down if overstocked
                await prisma.good.update({
                    where: { id: outputGood.id },
                    data: { currentStockLevel: { increment: unitsProduced } }
                });

                // Update the company's own inventory entry
                await prisma.goodInventory.upsert({
                    where: { assetId_goodId: { assetId: company.id, goodId: outputGood.id } },
                    update: { quantity: { increment: unitsProduced } },
                    create: { assetId: company.id, goodId: outputGood.id, quantity: unitsProduced }
                });

                // Apply a small positive price boost (0.2% to 0.5%)
                const boost = 1 + (Math.random() * 0.003 + 0.002);
                const newPrice = company.basePrice * boost;
                const newDemand = newPrice * company.supplyPool;
                await prisma.asset.update({
                    where: { id: company.id },
                    data: { basePrice: newPrice, demandPool: newDemand }
                });

                console.log(`[Production] ✅ ${company.symbol} produced ${unitsProduced} units of ${outputGood.name}.`);
            } else {
                // Apply a negative price shock (0.5% to 1.2%)
                const penalty = 1 - (Math.random() * 0.007 + 0.005);
                const newPrice = company.basePrice * penalty;
                const newDemand = newPrice * company.supplyPool;
                await prisma.asset.update({
                    where: { id: company.id },
                    data: { basePrice: newPrice, demandPool: newDemand }
                });

                console.log(`[Production] ❌ ${company.symbol} halted — missing inputs: ${shortfalls.join(', ')}.`);
            }
        }

        // Process supply contract deliveries
        await processSupplyContractDeliveries();

        console.log(`[${new Date().toISOString()}] Production cycle complete.`);
    } catch (e) {
        console.error('[Production] Error in production cycle:', e);
    }
}

/**
 * For each ACTIVE supply contract, deliver goods from seller to buyer.
 * If the seller doesn't have enough inventory, the contract is marked BROKEN.
 */
async function processSupplyContractDeliveries() {
    const contracts = await prisma.supplyContract.findMany({
        where: { status: 'ACTIVE' },
        include: {
            buyer: true,
            seller: true,
            good: true
        }
    });

    for (const contract of contracts) {
        const sellerInv = await prisma.goodInventory.findUnique({
            where: { assetId_goodId: { assetId: contract.sellerId, goodId: contract.goodId } }
        });

        const available = sellerInv?.quantity ?? 0;

        if (available >= contract.unitsPerCycle) {
            // Transfer goods
            await prisma.goodInventory.update({
                where: { id: sellerInv.id },
                data: { quantity: { decrement: contract.unitsPerCycle } }
            });

            await prisma.goodInventory.upsert({
                where: { assetId_goodId: { assetId: contract.buyerId, goodId: contract.goodId } },
                update: { quantity: { increment: contract.unitsPerCycle } },
                create: { assetId: contract.buyerId, goodId: contract.goodId, quantity: contract.unitsPerCycle }
            });

            // Deduct payment from buyer's company (as a base price adjustment proxy)
            console.log(`[Contract] 📦 ${contract.seller.symbol} → ${contract.buyer.symbol}: ${contract.unitsPerCycle} units of ${contract.good.name}.`);
        } else {
            // Seller can't deliver — break the contract and shock both parties
            await prisma.supplyContract.update({
                where: { id: contract.id },
                data: { status: 'BROKEN' }
            });

            // shock seller
            const sPrice = contract.seller.basePrice * 0.985;
            await prisma.asset.update({ where: { id: contract.sellerId }, data: { basePrice: sPrice, demandPool: sPrice * contract.seller.supplyPool } });
            // shock buyer
            const bPrice = contract.buyer.basePrice * 0.990;
            await prisma.asset.update({ where: { id: contract.buyerId }, data: { basePrice: bPrice, demandPool: bPrice * contract.buyer.supplyPool } });

            console.log(`[Contract] 💥 BROKEN: ${contract.seller.symbol} failed to deliver to ${contract.buyer.symbol}. Both penalised.`);
        }
    }
}

export { runProductionCycle, processSupplyContractDeliveries, PRODUCTION_CYCLE_INTERVAL };
