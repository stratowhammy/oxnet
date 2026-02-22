import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/union?userId=xxx — get union leader's workforce pool
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const pool = await prisma.workforcePool.findFirst({
            where: { unionLeaderId: userId },
            include: {
                facility: {
                    include: { asset: { select: { symbol: true, name: true } } }
                },
                strikes: { where: { isActive: true } }
            }
        });
        if (!pool) return NextResponse.json({ error: 'No workforce pool found' }, { status: 404 });
        return NextResponse.json(pool);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/union/negotiate — Union leader sets wage demand
// POST /api/union/strike — Union leader calls or ends a strike
// (route.ts handles both via action field)
