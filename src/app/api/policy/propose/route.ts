import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_TYPES = ['TARIFF', 'SUBSIDY', 'TAX_HOLIDAY', 'SECTOR_BAN'];

// POST /api/policy/propose — Politician proposes a policy
export async function POST(req: Request) {
    try {
        const { userId, title, description, policyType, targetSector, targetRole, effectValue, daysToVote } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'POLITICIAN') return NextResponse.json({ error: 'Only Politicians can propose policies' }, { status: 403 });

        if (!VALID_TYPES.includes(policyType)) return NextResponse.json({ error: `Invalid policyType. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });

        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + (daysToVote || 3));

        const proposal = await prisma.policyProposal.create({
            data: {
                proposerId: userId,
                title,
                description,
                policyType,
                targetSector: targetSector || null,
                targetRole: targetRole || null,
                effectValue: Number(effectValue),
                endsAt
            }
        });

        return NextResponse.json(proposal);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
