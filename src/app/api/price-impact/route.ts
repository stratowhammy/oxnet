import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AutomatedMarketMaker } from '@/lib/amm';
import prisma from '@/lib/db';

const impactSchema = z.object({
    assetId: z.string().min(1), // Changed to assetId to fetch real pool data
    amount: z.number().positive(),
    isBuy: z.boolean(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = impactSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const { assetId, amount, isBuy } = result.data;

        const asset = await prisma.asset.findUnique({
            where: { id: assetId }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        const impact = AutomatedMarketMaker.calculatePriceImpact(
            asset.supplyPool,
            asset.demandPool,
            amount,
            isBuy
        );

        // Also estimate total cost
        // Re-use logic or duplicate lightly for preview
        const k = asset.supplyPool * asset.demandPool;
        let estimatedPrice = 0;
        let estimatedTotal = 0;

        // Quick estimate logic (could be shared in AMM class)
        if (isBuy) {
            const newSupply = asset.supplyPool - amount;
            if (newSupply <= 0) {
                estimatedTotal = Infinity;
            } else {
                const newDemand = k / newSupply;
                const cost = newDemand - asset.demandPool;
                const fee = cost * 0.005;
                estimatedTotal = cost + fee;
                estimatedPrice = cost / amount;
            }
        } else {
            const newSupply = asset.supplyPool + amount;
            const newDemand = k / newSupply;
            const proceeds = asset.demandPool - newDemand;
            const fee = proceeds * 0.005;
            estimatedTotal = proceeds - fee; // Net proceeds
            estimatedPrice = proceeds / amount;
        }

        return NextResponse.json({
            impact,
            estimatedTotal,
            estimatedPrice,
            fee: estimatedTotal * 0.005 // Approx
        });

    } catch (error) {
        console.error("Price impact error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
