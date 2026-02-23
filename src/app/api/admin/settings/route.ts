import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAdmin() {
    const cookieStore = await cookies();
    const session = cookieStore.get('oxnet_session');
    if (!session) return false;
    const user = await prisma.user.findUnique({ where: { id: session.value } });
    return user?.role === 'ADMIN';
}

export async function GET() {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const settings = await prisma.globalSetting.findMany();
        const settingsMap = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);
        return NextResponse.json(settingsMap);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { key, value } = await req.json();

        await prisma.globalSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        return NextResponse.json({ message: 'Settings updated successfully' });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
