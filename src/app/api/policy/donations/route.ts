import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/policy/donations?userId=xxx — get total donations received by a politician
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const donations = await prisma.campaignDonation.findMany({ where: { recipientId: userId } });
        const total = donations.reduce((sum, d) => sum + d.amount, 0);
        return NextResponse.json({ total, count: donations.length, donations });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/policy/donations — Any user donates to a politician's campaign
export async function POST(req: Request) {
    try {
        const { userId, recipientId, amount, message } = await req.json();

        const [donor, recipient] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.user.findUnique({ where: { id: recipientId } })
        ]);

        if (!donor) return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
        if (!recipient || recipient.playerRole !== 'POLITICIAN') return NextResponse.json({ error: 'Recipient is not a Politician' }, { status: 400 });
        if (donor.deltaBalance < amount) return NextResponse.json({ error: 'Insufficient Δ balance' }, { status: 400 });

        await prisma.$transaction([
            prisma.user.update({ where: { id: userId }, data: { deltaBalance: { decrement: amount } } }),
            prisma.user.update({ where: { id: recipientId }, data: { deltaBalance: { increment: amount } } }),
            prisma.campaignDonation.create({ data: { donorId: userId, recipientId, amount, message } })
        ]);

        return NextResponse.json({ success: true, amount });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
