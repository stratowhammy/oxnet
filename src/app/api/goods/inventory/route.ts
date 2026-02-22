import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/goods/inventory?assetId=xxx — get all goods inventory for a company
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

    try {
        const inventory = await prisma.goodInventory.findMany({
            where: { assetId },
            include: {
                good: { select: { id: true, name: true, unit: true, listPrice: true, isListedForSale: true } }
            }
        });
        return NextResponse.json(inventory);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
