import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AutomatedMarketMaker } from '@/lib/amm';
import prisma from '@/lib/db';

const tradeSchema = z.object({
    userId: z.string().min(1),
    assetId: z.string().min(1),
    type: z.enum(['BUY', 'SELL', 'SHORT']),
    quantity: z.number().positive(),
    leverage: z.number().min(1).max(10).optional().default(1),
    takeProfitPrice: z.number().positive().optional(),
    stopLossPrice: z.number().positive().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = tradeSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const { userId, assetId, type, quantity, leverage, takeProfitPrice, stopLossPrice } = result.data;

        // In a real app, verify authentication here. 
        // For this task, assuming userId is passed and trusted or we use a mock session.

        const tradeResult = await AutomatedMarketMaker.executeTrade({
            userId,
            assetId,
            type,
            quantity,
            leverage,
            takeProfitPrice,
            stopLossPrice
        });

        if (!tradeResult.success) {
            return NextResponse.json({ error: tradeResult.message }, { status: 400 });
        }

        return NextResponse.json(tradeResult);

    } catch (error) {
        console.error("Trade execution error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
