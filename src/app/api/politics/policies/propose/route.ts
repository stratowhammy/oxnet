import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { userId, title, description, policyType, targetSector, effectValue, daysToVote } = await request.json();

        if (!userId || !title || !description || !policyType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.politicalRank < 2) {
            return NextResponse.json({ error: 'Insufficient political rank to propose federal policy' }, { status: 403 });
        }

        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + (daysToVote || 3));

        const proposal = await prisma.policyProposal.create({
            data: {
                title,
                description,
                policyType,
                targetSector: targetSector || null,
                effectValue: parseFloat(effectValue),
                status: 'VOTING',
                proposerId: userId,
                endsAt
            }
        });

        return NextResponse.json(proposal);
    } catch (error) {
        console.error('Failed to propose policy:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
