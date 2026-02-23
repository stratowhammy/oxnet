import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/admin/settings — Return all global settings as { key: value }
export async function GET() {
    try {
        const settings = await prisma.globalSetting.findMany();
        const map: Record<string, string> = {};
        for (const s of settings) map[s.key] = s.value;
        return NextResponse.json(map);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH /api/admin/settings — Upsert a single global setting { key, value }
export async function PATCH(req: Request) {
    try {
        const { key, value } = await req.json();
        if (!key || value === undefined) {
            return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
        }

        const setting = await prisma.globalSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
        });

        return NextResponse.json(setting);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
