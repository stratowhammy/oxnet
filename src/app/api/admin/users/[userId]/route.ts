import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// PATCH /api/admin/users/[userId] — Update a user's deltaBalance, frozen status, etc.
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const body = await request.json();

        const updateData: Record<string, any> = {};

        if (body.deltaBalance !== undefined) updateData.deltaBalance = parseFloat(body.deltaBalance);
        if (body.frozen !== undefined) updateData.frozen = Boolean(body.frozen);
        if (body.role !== undefined) updateData.role = body.role;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Admin user PATCH error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[userId] — Remove a user
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;

        // Delete dependent records first
        await prisma.portfolio.deleteMany({ where: { userId } });
        await prisma.transaction.deleteMany({ where: { userId } });
        await prisma.limitOrder.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ message: 'User deleted' });
    } catch (error) {
        console.error("Admin user DELETE error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
