import { NextResponse } from 'next/server';
import { AutomatedMarketMaker } from '@/lib/amm';
import prisma from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
    assetId: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const { assetId } = result.data;

        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // This will iteratively resolve all crossed orders (the cascade)
        await AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, asset.basePrice);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Order resolution error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
