import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// PATCH /api/admin/users/[userId]/portfolio — Adjust a portfolio position quantity
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const body = await request.json();
        const { assetId, quantity } = body;

        if (!assetId || quantity === undefined) {
            return NextResponse.json({ error: 'assetId and quantity are required' }, { status: 400 });
        }

        const newQuantity = parseFloat(quantity);

        // Find the existing portfolio entry
        const portfolio = await prisma.portfolio.findFirst({
            where: { userId, assetId, isShortPosition: false }
        });

        if (newQuantity <= 0) {
            // Remove the position if quantity is 0 or negative
            if (portfolio) {
                await prisma.portfolio.delete({ where: { id: portfolio.id } });
            }
            return NextResponse.json({ message: 'Position removed' });
        }

        if (portfolio) {
            await prisma.portfolio.update({
                where: { id: portfolio.id },
                data: { quantity: newQuantity }
            });
        } else {
            // Create a new position
            const asset = await prisma.asset.findUnique({ where: { id: assetId } });
            if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

            await prisma.portfolio.create({
                data: {
                    userId,
                    assetId,
                    quantity: newQuantity,
                    averageEntryPrice: asset.basePrice,
                    isShortPosition: false
                }
            });
        }

        return NextResponse.json({ message: 'Portfolio updated' });
    } catch (error) {
        console.error("Admin portfolio PATCH error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[userId]/portfolio — Wipe a specific asset position
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const assetId = searchParams.get('assetId');

        if (!assetId) {
            return NextResponse.json({ error: 'assetId query param required' }, { status: 400 });
        }

        await prisma.portfolio.deleteMany({
            where: { userId, assetId }
        });

        return NextResponse.json({ message: 'Position removed' });
    } catch (error) {
        console.error("Admin portfolio DELETE error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
