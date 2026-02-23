import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/goods/purchase — Retail/HFM user purchases goods from marketplace
export async function POST(req: Request) {
    try {
        const { userId, goodId, quantity } = await req.json();

        if (!userId || !goodId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: 'Invalid purchase request' }, { status: 400 });
        }

        const [user, good] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.good.findUnique({ where: { id: goodId }, include: { producer: true } })
        ]);

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (!good) return NextResponse.json({ error: 'Good not found' }, { status: 404 });
        if (!good.isListedForSale) return NextResponse.json({ error: 'This good is not listed for sale' }, { status: 400 });

        // Check seller inventory
        const sellerInv = await prisma.goodInventory.findUnique({
            where: { assetId_goodId: { assetId: good.producerId, goodId: good.id } }
        });
        const available = sellerInv?.quantity ?? 0;
        if (available < quantity) {
            return NextResponse.json({ error: `Only ${available.toFixed(0)} units available` }, { status: 400 });
        }

        const totalCost = quantity * good.listPrice;
        if (user.deltaBalance < totalCost) {
            return NextResponse.json({ error: 'Insufficient Δ balance' }, { status: 400 });
        }

        const buyerMunicipality = user.municipalityId
            ? await prisma.municipality.findUnique({ where: { id: user.municipalityId } })
            : null;

        const taxRate = buyerMunicipality?.goodsTaxRate ?? 0;
        const taxAmount = totalCost * taxRate;

        // Execute the purchase in a transaction
        await prisma.$transaction(async (tx) => {
            // Deduct from buyer
            await tx.user.update({ where: { id: userId }, data: { deltaBalance: { decrement: totalCost } } });

            // Tax flow to municipality
            if (buyerMunicipality && taxAmount > 0) {
                await tx.municipality.update({
                    where: { id: buyerMunicipality.id },
                    data: { deltaReserve: { increment: taxAmount } }
                });
            }
            // Reduce inventory
            await tx.goodInventory.update({
                where: { id: sellerInv!.id },
                data: { quantity: { decrement: quantity } }
            });

            // Update good total stock (just for tracking)
            await tx.good.update({
                where: { id: goodId },
                data: { currentStockLevel: { decrement: quantity } }
            });

            // Record the purchase
            await tx.consumerPurchase.create({
                data: { userId, goodId, quantity, pricePaid: good.listPrice }
            });

            // Record transaction in ledger
            await tx.transaction.create({
                data: {
                    userId,
                    assetId: good.producerId,
                    type: 'GOODS_PURCHASE',
                    amount: quantity,
                    price: good.listPrice,
                    fee: 0,
                    ticker: good.name.substring(0, 10).toUpperCase(),
                    description: `Retail purchase of ${good.name}`
                }
            });

            // Apply demand-driven price boost to producer's stock
            const impact = (quantity / 500) * 0.01; // 1% boost per 500 units
            const asset = await tx.asset.findUnique({ where: { id: good.producerId } });
            if (asset) {
                const newPrice = asset.basePrice * (1 + impact);
                await tx.asset.update({
                    where: { id: asset.id },
                    data: {
                        basePrice: newPrice,
                        demandPool: newPrice * asset.supplyPool
                    }
                });
            }

            // NEWS TRIGGER: Large purchases make the news
            if (totalCost >= 5000) {
                await tx.newsStory.create({
                    data: {
                        headline: `Market Surge: ${quantity} units of ${good.name} purchased!`,
                        context: `A major demand spike for ${good.name} has been detected. Analysts suggest this could signal a supply squeeze for ${good.producer.name}.`,
                        targetSector: good.producer.sector,
                        targetSpecialty: good.name,
                        impactScope: 'COMPANY',
                        direction: 'UP',
                        intensityWeight: 1,
                        competitorInversion: false
                    }
                });
            }
        });

        return NextResponse.json({ success: true, totalCost, quantity, good: good.name });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
