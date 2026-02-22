import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');

        if (!session || !session.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const senderId = session.value;
        const body = await request.json();
        const { recipientUsername, amount } = body;

        if (!recipientUsername || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
        }

        const transferAmount = parseFloat(amount);

        // Fetch Sender
        const sender = await prisma.user.findUnique({ where: { id: senderId } });
        if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 });

        // Calculate actual available liquidity (Balance - Margin)
        const availableDelta = sender.deltaBalance - (sender.marginLoan || 0);

        if (availableDelta < transferAmount) {
            return NextResponse.json({ error: 'Insufficient available funds' }, { status: 400 });
        }

        // Fetch Recipient
        const recipient = await prisma.user.findUnique({ where: { username: recipientUsername } });

        if (!recipient) {
            return NextResponse.json({ error: `User ${recipientUsername} not found` }, { status: 404 });
        }

        if (sender.id === recipient.id) {
            return NextResponse.json({ error: 'Cannot transfer funds to yourself' }, { status: 400 });
        }

        // Execute Transfer as an atomic transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { id: sender.id },
                data: { deltaBalance: { decrement: transferAmount } }
            }),
            prisma.user.update({
                where: { id: recipient.id },
                data: { deltaBalance: { increment: transferAmount } }
            })
        ]);

        return NextResponse.json({ message: `Successfully transferred ${transferAmount} Delta to ${recipient.username}` });

    } catch (error) {
        console.error("Transfer API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
