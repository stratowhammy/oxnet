import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { auctionId, userId, bidAmount } = await req.json();

        if (!auctionId || !userId || typeof bidAmount !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const auction = await prisma.goalAuction.findUnique({
            where: { id: auctionId }
        });

        if (!auction) {
            return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
        }

        if (!auction.isActive || new Date() > new Date(auction.endTime)) {
            return NextResponse.json({ error: 'Auction is closed' }, { status: 400 });
        }

        if (bidAmount <= auction.highestBid) {
            return NextResponse.json({ error: 'Bid must be higher than current highest bid' }, { status: 400 });
        }

        if (bidAmount < auction.minBid) {
            return NextResponse.json({ error: 'Bid does not meet the minimum starting bid' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.deltaBalance < bidAmount) {
            return NextResponse.json({ error: 'Insufficient Delta for this bid' }, { status: 400 });
        }

        // Technically, this doesn't deduct money yet (money is deducted on auction close)
        // We just record them as the highest bidder.
        // *Optional robust logic: "lock" funds. We'll stick to check-on-bid, deduct-on-win.

        await prisma.goalAuction.update({
            where: { id: auctionId },
            data: {
                highestBid: bidAmount,
                highestBidderId: userId
            }
        });

        return NextResponse.json({ success: true, message: 'Bid placed successfully' });

    } catch (error) {
        console.error("Bid error:", error);
        return NextResponse.json({ error: 'Server error processing bid' }, { status: 500 });
    }
}
