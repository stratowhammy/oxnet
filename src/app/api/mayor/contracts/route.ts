import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/mayor/contracts?status=OPEN — list contracts (optionally filtered by status)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    try {
        const contracts = await prisma.municipalContract.findMany({
            where: status ? { status } : {},
            include: {
                municipality: { select: { name: true } },
                good: { select: { name: true, unit: true } },
                bids: { include: { bidder: { select: { username: true, id: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(contracts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/mayor/contracts — Mayor issues a new procurement contract
export async function POST(req: Request) {
    try {
        const { userId, goodId, quantityRequired, budgetDelta, daysUntilDeadline } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'MAYOR') return NextResponse.json({ error: 'Only Mayors can issue contracts' }, { status: 403 });

        const municipality = await prisma.municipality.findFirst({ where: { mayorId: userId } });
        if (!municipality) return NextResponse.json({ error: 'No municipality found' }, { status: 404 });

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (daysUntilDeadline || 7));

        const contract = await prisma.municipalContract.create({
            data: { municipalityId: municipality.id, goodId, quantityRequired, budgetDelta, deadline }
        });

        return NextResponse.json(contract);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
