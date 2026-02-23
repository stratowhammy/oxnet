import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/municipalities — List all municipalities
export async function GET() {
    try {
        const municipalities = await prisma.municipality.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                _count: { select: { residents: true } }
            }
        });
        return NextResponse.json(municipalities);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
