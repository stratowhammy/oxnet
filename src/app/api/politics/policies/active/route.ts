import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const activePolicies = await prisma.policyProposal.findMany({
            where: {
                status: 'VOTING',
                endsAt: { gte: new Date() }
            },
            include: {
                proposer: {
                    select: { username: true, politicalRank: true }
                }
            },
            orderBy: { endsAt: 'asc' }
        });

        return NextResponse.json(activePolicies);
    } catch (error) {
        console.error('Failed to fetch active policies:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
