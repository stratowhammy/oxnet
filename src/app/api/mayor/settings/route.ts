import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/mayor/settings — update the mayor's municipality settings (e.g. tax rate)
export async function PATCH(req: Request) {
    try {
        const { userId, goodsTaxRate } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'MAYOR') return NextResponse.json({ error: 'Only Mayors can update city settings' }, { status: 403 });

        const municipality = await prisma.municipality.findFirst({ where: { mayorId: userId } });
        if (!municipality) return NextResponse.json({ error: 'No municipality found' }, { status: 404 });

        const clampedRate = Math.min(0.10, Math.max(0, goodsTaxRate));
        const updated = await prisma.municipality.update({
            where: { id: municipality.id },
            data: { goodsTaxRate: clampedRate }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
