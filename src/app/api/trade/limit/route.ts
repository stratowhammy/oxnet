import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';

const limitOrderSchema = z.object({
    userId: z.string().min(1),
    assetId: z.string().min(1),
    type: z.enum(['BUY', 'SELL', 'SHORT']),
    quantity: z.number().positive(),
    price: z.number().positive(),
    leverage: z.number().min(1).max(10).optional().default(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // The frontend sends `limitPrice`, map it to `price` for schema validation
        if (body.limitPrice) {
            body.price = body.limitPrice;
            delete body.limitPrice;
        }

        const result = limitOrderSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const { userId, assetId, type, quantity, price, leverage } = result.data;

        // Verify user and asset existence
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });

        if (!user || !asset) {
            return NextResponse.json({ error: 'User or Asset not found' }, { status: 404 });
        }

        // Store the limit order in the database
        const limitOrder = await prisma.limitOrder.create({
            data: {
                userId,
                assetId,
                type,
                quantity,
                price,
                leverage,
                status: 'PENDING',
            }
        });

        return NextResponse.json({ success: true, message: `Limit Order created at ${price}`, order: limitOrder });

    } catch (error) {
        console.error("Limit Order creation error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
