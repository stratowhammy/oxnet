import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const assets = await prisma.asset.findMany({
            select: { id: true, basePrice: true }
        });
        return NextResponse.json(assets);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }
}
