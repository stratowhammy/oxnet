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
        const { newCallsign } = body;

        if (!newCallsign || typeof newCallsign !== 'string' || newCallsign.trim() === '') {
            return NextResponse.json({ error: 'Invalid callsign provided' }, { status: 400 });
        }

        const trimmedCallsign = newCallsign.trim();

        // Check if username corresponds to any existing user
        const existingUser = await prisma.user.findFirst({
            where: { username: trimmedCallsign }
        });

        if (existingUser && existingUser.id !== userId) {
            return NextResponse.json({ error: 'This callsign is already taken by another Operator.' }, { status: 400 });
        }

        // Update User
        await prisma.user.update({
            where: { id: userId },
            data: { username: trimmedCallsign }
        });

        return NextResponse.json({ message: 'Callsign updated successfully.' });

    } catch (error) {
        console.error("Change Callsign API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
