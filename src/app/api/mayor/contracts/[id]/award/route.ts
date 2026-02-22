import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/mayor/contracts/[id]/award — Mayor awards a specific bid
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { userId, bidId } = await req.json();
        const contractId = params.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'MAYOR') return NextResponse.json({ error: 'Only Mayors can award contracts' }, { status: 403 });

        const bid = await prisma.municipalContractBid.findUnique({ where: { id: bidId } });
        if (!bid || bid.contractId !== contractId) return NextResponse.json({ error: 'Bid not found on this contract' }, { status: 404 });

        const updated = await prisma.municipalContract.update({
            where: { id: contractId },
            data: { status: 'AWARDED', awardedBidId: bidId }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
