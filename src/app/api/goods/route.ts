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
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/goods — CEO creates or updates their company's good listing
export async function POST(req: Request) {
    try {
        const { userId, name, unit, baseProductionCost, listPrice, isListedForSale } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'CEO') {
            return NextResponse.json({ error: 'Only CEOs can manage goods' }, { status: 403 });
        }

        const assetId = user.managedAssetId;
        if (!assetId) return NextResponse.json({ error: 'CEO has no managed company' }, { status: 400 });

        // Find existing good for this producer
        let good = await prisma.good.findFirst({ where: { producerId: assetId } });

        if (good) {
            good = await prisma.good.update({
                where: { id: good.id },
                data: {
                    name,
                    unit,
                    baseProductionCost,
                    listPrice,
                    isListedForSale: isListedForSale ?? good.isListedForSale
                }
            });
        } else {
            good = await prisma.good.create({
                data: {
                    name,
                    unit,
                    producerId: assetId,
                    baseProductionCost,
                    listPrice,
                    isListedForSale: isListedForSale ?? false,
                }
            });
        }

        return NextResponse.json(good);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
