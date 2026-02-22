import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/goods — list all goods currently listed for sale
export async function GET() {
    try {
        const goods = await prisma.good.findMany({
            where: { isListedForSale: true },
            include: {
                producer: {
                    select: { name: true, symbol: true, sector: true }
                }
            },
            orderBy: { listPrice: 'asc' }
        });
        return NextResponse.json(goods);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/goods — CEO creates or updates their company's good listing
export async function POST(req) {
    try {
        const { userId, name, unit, baseProductionCost, listPrice, isListedForSale } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'CEO') {
            return NextResponse.json({ error: 'Only CEOs can manage goods' }, { status: 403 });
        }

        const assetId = user.managedAssetId;
        if (!assetId) return NextResponse.json({ error: 'CEO has no managed company' }, { status: 400 });

        // Upsert good for this producer
        const good = await prisma.good.upsert({
            where: {
                // Use a findFirst workaround since there is no unique constraint on producerId alone
                // In practice, create if not exists
                id: 'nonexistent'
            },
            update: { listPrice, isListedForSale },
            create: {
                name,
                unit,
                producerId: assetId,
                baseProductionCost,
                listPrice,
                isListedForSale: isListedForSale ?? false,
            }
        });

        return NextResponse.json(good);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
