import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');

        if (!session || !session.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.value },
            include: {
                portfolios: {
                    include: { asset: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ deltaBalance: user.deltaBalance, portfolios: user.portfolios });
    } catch (error) {
        console.error("Portfolio fetch error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
