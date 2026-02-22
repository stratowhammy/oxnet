import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/factory?userId=xxx — get the factory owner's production facility
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const facility = await prisma.productionFacility.findFirst({
            where: { ownerId: userId },
            include: {
                asset: { select: { symbol: true, name: true } },
                workforcePool: {
                    include: { strikes: { where: { isActive: true } } }
                }
            }
        });
        if (!facility) return NextResponse.json({ error: 'No facility found' }, { status: 404 });
        return NextResponse.json(facility);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH /api/factory — Factory owner updates wages and headcount
export async function PATCH(req: Request) {
    try {
        const { userId, wages, headcount } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'FACTORY_OWNER') return NextResponse.json({ error: 'Only Factory Owners can update facility settings' }, { status: 403 });

        const facility = await prisma.productionFacility.findFirst({ where: { ownerId: userId }, include: { workforcePool: true } });
        if (!facility) return NextResponse.json({ error: 'No facility found' }, { status: 404 });

        const newCapacity = facility.onStrike ? 0 : Math.min(facility.maxCapacity, headcount * 10);

        const updated = await prisma.productionFacility.update({
            where: { id: facility.id },
            data: { wages: Number(wages), headcount: Number(headcount), currentCapacity: newCapacity }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
