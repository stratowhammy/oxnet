import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;

    try {
        const pendingOrders = await prisma.limitOrder.findMany({
            where: {
                assetId,
                status: 'PENDING'
            },
            orderBy: {
                price: 'asc'
            }
        });

        const buyOrders = pendingOrders.filter(o => o.type === 'BUY' || o.type === 'COVER');
        const sellOrders = pendingOrders.filter(o => o.type === 'SELL' || o.type === 'SHORT');

        // Aggregate bids by price
        const bidMap = new Map<number, number>();
        for (const order of buyOrders) {
            bidMap.set(order.price, (bidMap.get(order.price) || 0) + order.quantity);
        }

        // Aggregate asks by price
        const askMap = new Map<number, number>();
        for (const order of sellOrders) {
            askMap.set(order.price, (askMap.get(order.price) || 0) + order.quantity);
        }

        const bids = Array.from(bidMap.entries())
            .map(([price, size]) => ({ price, size, total: price * size }))
            .sort((a, b) => b.price - a.price); // Descending for Bids

        const asks = Array.from(askMap.entries())
            .map(([price, size]) => ({ price, size, total: price * size }))
            .sort((a, b) => a.price - b.price); // Ascending for Asks

        return NextResponse.json({ bids, asks });
    } catch (error) {
        console.error("Error fetching orderbook:", error);
        return NextResponse.json({ error: 'Failed to fetch orderbook' }, { status: 500 });
    }
}
