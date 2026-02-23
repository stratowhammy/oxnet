import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

// GET /api/municipal-events — Returns events for the current user's municipality
export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('oxnet_session')?.value;
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { municipalityId: true }
        });

        if (!user?.municipalityId) {
            return NextResponse.json([]); // No municipality assigned
        }

        const events = await prisma.municipalEvent.findMany({
            where: { municipalityId: user.municipalityId },
            orderBy: { publishedAt: 'desc' },
            take: 20,
            include: {
                municipality: { select: { name: true } }
            }
        });

        return NextResponse.json(events);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
