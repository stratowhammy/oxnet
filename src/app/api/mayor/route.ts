import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/mayor?userId=xxx — get the mayor's municipality
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const municipality = await prisma.municipality.findFirst({
            where: { mayorId: userId },
            include: {
                contracts: {
                    include: {
                        good: { select: { name: true, unit: true } },
                        bids: { include: { bidder: { select: { username: true } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!municipality) return NextResponse.json({ error: 'No municipality found' }, { status: 404 });
        return NextResponse.json(municipality);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
