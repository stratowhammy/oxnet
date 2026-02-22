import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/contracts — get all contracts involving the queried company
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId');
    if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

    try {
        const contracts = await prisma.supplyContract.findMany({
            where: {
                OR: [{ buyerId: assetId }, { sellerId: assetId }]
            },
            include: {
                buyer: { select: { name: true, symbol: true } },
                seller: { select: { name: true, symbol: true } },
                good: { select: { name: true, unit: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(contracts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/contracts — CEO offers a new supply contract
export async function POST(req: Request) {
    try {
        const { userId, buyerId, goodId, pricePerUnit, unitsPerCycle } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'CEO') {
            return NextResponse.json({ error: 'Only CEOs can offer supply contracts' }, { status: 403 });
        }

        const sellerId = user.managedAssetId;
        if (!sellerId) return NextResponse.json({ error: 'No managed company' }, { status: 400 });

        // Verify this CEO's company produces the requested good
        const good = await prisma.good.findFirst({
            where: { id: goodId, producerId: sellerId }
        });
        if (!good) {
            return NextResponse.json({ error: 'Your company does not produce this good' }, { status: 400 });
        }

        const contract = await prisma.supplyContract.create({
            data: {
                buyerId,
                sellerId,
                goodId,
                pricePerUnit,
                unitsPerCycle,
                status: 'PENDING'
            }
        });

        return NextResponse.json(contract);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
