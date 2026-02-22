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

        // Execute the purchase in a transaction
        await prisma.$transaction([
            // Deduct from buyer
            prisma.user.update({ where: { id: userId }, data: { deltaBalance: { decrement: totalCost } } }),
            // Add to seller (producer's company balance via basePrice appreciation)
            // Reduce inventory
            prisma.goodInventory.update({
                where: { id: sellerInv!.id },
                data: { quantity: { decrement: quantity } }
            }),
            // Record the purchase
            prisma.consumerPurchase.create({
                data: { userId, goodId, quantity, pricePaid: good.listPrice }
            }),
            // Apply demand-driven price boost to producer's stock
            prisma.asset.update({
                where: { id: good.producerId },
                data: {
                    basePrice: { multiply: 1 + (quantity / 1000) * 0.01 }, // tiny boost per unit sold
                    demandPool: { multiply: 1 + (quantity / 1000) * 0.01 }
                }
            })
        ]);

        return NextResponse.json({ success: true, totalCost, quantity, good: good.name });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
