import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/mayor/contracts/bid — Any user submits a bid on an open contract
export async function POST(req: Request) {
    try {
        const { userId, contractId, pricePerUnit } = await req.json();

        const contract = await prisma.municipalContract.findUnique({ where: { id: contractId } });
        if (!contract || contract.status !== 'OPEN') return NextResponse.json({ error: 'Contract is not open' }, { status: 400 });

        const bid = await prisma.municipalContractBid.create({
            data: { contractId, bidderId: userId, pricePerUnit }
        });

        return NextResponse.json(bid);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
