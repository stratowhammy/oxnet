import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/policy/vote — Any user votes on a policy proposal
export async function POST(req: Request) {
    try {
        const { userId, proposalId, inFavor } = await req.json();

        const proposal = await prisma.policyProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        if (proposal.status !== 'VOTING') return NextResponse.json({ error: 'Voting is closed for this proposal' }, { status: 400 });
        if (new Date() > proposal.endsAt) return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 });

        // Upsert so a user can't vote twice (schema has @@unique on [proposalId, voterId])
        await prisma.policyVote.upsert({
            where: { proposalId_voterId: { proposalId, voterId: userId } },
            create: { proposalId, voterId: userId, inFavor },
            update: { inFavor }
        });

        // Recount votes
        const votes = await prisma.policyVote.findMany({ where: { proposalId } });
        const votesFor = votes.filter(v => v.inFavor).length;
        const votesAgainst = votes.filter(v => !v.inFavor).length;

        await prisma.policyProposal.update({
            where: { id: proposalId },
            data: { votesFor, votesAgainst }
        });

        return NextResponse.json({ success: true, votesFor, votesAgainst });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
