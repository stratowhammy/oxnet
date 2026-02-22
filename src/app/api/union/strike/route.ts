import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/union/strike — Call or end a strike
export async function POST(req: Request) {
    try {
        const { userId, action, strikeReason, strikeId } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'UNION_LEADER') return NextResponse.json({ error: 'Only Union Leaders can manage strikes' }, { status: 403 });

        const pool = await prisma.workforcePool.findFirst({ where: { unionLeaderId: userId }, include: { facility: true } });
        if (!pool) return NextResponse.json({ error: 'No workforce pool found' }, { status: 404 });

        if (action === 'START') {
            if (pool.facility.onStrike) return NextResponse.json({ error: 'Strike is already active' }, { status: 400 });

            const strike = await prisma.$transaction([
                // Create strike record
                prisma.strikeAction.create({ data: { workforcePoolId: pool.id, reason: strikeReason } }),
                // Halt facility production
                prisma.productionFacility.update({ where: { id: pool.facilityId }, data: { onStrike: true, currentCapacity: 0 } })
            ]);

            return NextResponse.json({ strike: strike[0], message: 'Strike started. Production halted.' });

        } else if (action === 'END') {
            if (!strikeId) return NextResponse.json({ error: 'strikeId required' }, { status: 400 });

            await prisma.$transaction([
                // End strike record
                prisma.strikeAction.update({ where: { id: strikeId }, data: { isActive: false, endedAt: new Date() } }),
                // Resume facility at current headcount capacity
                prisma.productionFacility.update({ where: { id: pool.facilityId }, data: { onStrike: false, currentCapacity: pool.facility.headcount * 10 } })
            ]);

            return NextResponse.json({ message: 'Strike ended. Production resumed.' });
        } else {
            return NextResponse.json({ error: 'Invalid action. Use START or END.' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
