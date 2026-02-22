import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');

        if (!session || !session.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.value;
        const body = await request.json();
        const { lendingLimit, lendingRate } = body;

        if (lendingLimit === undefined || lendingRate === undefined) {
            return NextResponse.json({ error: 'Must provide both lending limit and rate' }, { status: 400 });
        }

        const limit = parseFloat(lendingLimit);
        const rate = parseFloat(lendingRate);

        if (limit < 0 || rate < 0 || rate > 1) {
            return NextResponse.json({ error: 'Invalid bounds. Limits must be positive, Rate must be between 0 and 1.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const maxAvailable = user.deltaBalance - (user.marginLoan || 0);

        if (limit > maxAvailable) {
            return NextResponse.json({ error: 'Lending limit cannot exceed available un-margined Delta balance.' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                lendingLimit: limit,
                lendingRate: rate
            }
        });

        return NextResponse.json({ message: 'Lending parameters updated successfully.' });

    } catch (error) {
        console.error("Lending Config API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
