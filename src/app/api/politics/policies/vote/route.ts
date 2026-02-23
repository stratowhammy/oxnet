import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { userId, proposalId, voteType } = await request.json(); // voteType: 'FOR' or 'AGAINST'

        if (!userId || !proposalId || !voteType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.politicalRank < 2) {
            return NextResponse.json({ error: 'Only federal politicians (Rank 2+) can vote on these proposals' }, { status: 403 });
        }

        const proposal = await prisma.policyProposal.findUnique({ where: { id: proposalId } });
        if (!proposal || proposal.status !== 'VOTING') {
            return NextResponse.json({ error: 'Active proposal not found' }, { status: 404 });
        }

        // Check for existing vote
        const existingVote = await prisma.policyVote.findFirst({
            where: {
                voterId: userId,
                proposalId: proposalId
            }
        });

        if (existingVote) {
            return NextResponse.json({ error: 'You have already cast a vote for this proposal' }, { status: 400 });
        }

        // Cast vote in transaction
        await prisma.$transaction(async (tx) => {
            await tx.policyVote.create({
                data: {
                    voterId: userId,
                    proposalId: proposalId,
                    inFavor: voteType === 'FOR'
                }
            });

            await tx.policyProposal.update({
                where: { id: proposalId },
                data: {
                    votesFor: voteType === 'FOR' ? { increment: 1 } : undefined,
                    votesAgainst: voteType === 'AGAINST' ? { increment: 1 } : undefined
                }
            });
        });

        return NextResponse.json({ message: 'Vote cast successfully' });

    } catch (error: any) {
        console.error('Failed to cast vote:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
