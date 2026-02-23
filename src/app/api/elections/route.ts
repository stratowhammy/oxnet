import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

// GET /api/elections — Returns active elections for the user's municipality
export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('oxnet_session')?.value;
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { municipalityId: true }
        });

        if (!user?.municipalityId) return NextResponse.json([]);

        const elections = await prisma.election.findMany({
            where: {
                municipalityId: user.municipalityId,
                status: { in: ['CAMPAIGNING', 'VOTING'] }
            },
            include: {
                candidates: {
                    include: {
                        user: { select: { username: true, playerRole: true } }
                    }
                },
                municipality: { select: { name: true } }
            },
            orderBy: { votingStart: 'asc' }
        });

        // Check if user already voted in each election
        const electionsWithVoteStatus = await Promise.all(
            elections.map(async (election) => {
                const existingVote = await prisma.ballotVote.findUnique({
                    where: { electionId_voterId: { electionId: election.id, voterId: userId } }
                });
                return { ...election, hasVoted: !!existingVote };
            })
        );

        return NextResponse.json(electionsWithVoteStatus);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/elections — Cast a vote
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('oxnet_session')?.value;
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { electionId, candidateId } = await req.json();

        if (!electionId || !candidateId) {
            return NextResponse.json({ error: 'electionId and candidateId are required' }, { status: 400 });
        }

        // Verify election is in VOTING status
        const election = await prisma.election.findUnique({ where: { id: electionId } });
        if (!election || election.status !== 'VOTING') {
            return NextResponse.json({ error: 'This election is not currently accepting votes' }, { status: 400 });
        }

        // Check if user already voted
        const existing = await prisma.ballotVote.findUnique({
            where: { electionId_voterId: { electionId, voterId: userId } }
        });
        if (existing) return NextResponse.json({ error: 'You have already voted in this election' }, { status: 409 });

        // Verify candidate belongs to this election
        const candidate = await prisma.candidate.findFirst({
            where: { id: candidateId, electionId }
        });
        if (!candidate) return NextResponse.json({ error: 'Invalid candidate' }, { status: 400 });

        // Cast vote
        await prisma.ballotVote.create({
            data: { electionId, voterId: userId, candidateId }
        });

        // Increment vote count
        await prisma.candidate.update({
            where: { id: candidateId },
            data: { voteCount: { increment: 1 } }
        });

        return NextResponse.json({ message: 'Vote cast successfully' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
