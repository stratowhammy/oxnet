import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/union/negotiate — Set the union's wage demand
export async function POST(req: Request) {
    try {
        const { userId, wagesDemand } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'UNION_LEADER') return NextResponse.json({ error: 'Only Union Leaders can negotiate wages' }, { status: 403 });

        const pool = await prisma.workforcePool.findFirst({ where: { unionLeaderId: userId } });
        if (!pool) return NextResponse.json({ error: 'No workforce pool found' }, { status: 404 });

        const updated = await prisma.workforcePool.update({
            where: { id: pool.id },
            data: { wagesDemand: Number(wagesDemand) }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
