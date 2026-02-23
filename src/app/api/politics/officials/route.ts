import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const minRank = parseInt(searchParams.get('minRank') || '2');

        const officials = await prisma.user.findMany({
            where: {
                politicalRank: { gte: minRank },
                isNPC: true
            },
            select: {
                id: true,
                username: true,
                politicalRank: true,
                backstory: true,
                traits: true,
                philosophy: true,
                isNPC: true
            },
            orderBy: { politicalRank: 'desc' }
        });

        return NextResponse.json(officials);
    } catch (error) {
        console.error('Failed to fetch officials:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
