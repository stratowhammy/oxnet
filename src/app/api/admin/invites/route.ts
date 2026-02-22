import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/admin/invites — list all invite codes with their role config
export async function GET(req: Request) {
    try {
        const invites = await prisma.inviteCode.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(invites);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/admin/invites — create invite code(s) with role config
// If `count` is provided, generate that many random codes. If `code` is provided, create a specific one.
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, label, allowedRoles, count } = body;

        const rolesString = Array.isArray(allowedRoles) ? allowedRoles.join(',') : (allowedRoles || 'CEO,TRADER,HFM');

        if (count && count > 0) {
            // Bulk generation
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid 0/O/1/I confusion
            const codes = [];
            for (let i = 0; i < Math.min(count, 99); i++) {
                let newCode = '';
                for (let j = 0; j < 8; j++) newCode += chars[Math.floor(Math.random() * chars.length)];
                codes.push({ code: newCode, label: label || null, allowedRoles: rolesString });
            }
            await prisma.inviteCode.createMany({ data: codes });
            return NextResponse.json(codes);
        }

        if (!code || code.length !== 8) return NextResponse.json({ error: 'Code must be exactly 8 characters' }, { status: 400 });

        const invite = await prisma.inviteCode.create({
            data: {
                code: code.toUpperCase().trim(),
                label: label || null,
                allowedRoles: rolesString,
            }
        });
        return NextResponse.json(invite);
    } catch (e: any) {
        if (e.code === 'P2002') return NextResponse.json({ error: 'That code already exists' }, { status: 409 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH /api/admin/invites — update a code's label and allowed roles
export async function PATCH(req: Request) {
    try {
        const { code, label, allowedRoles } = await req.json();
        if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

        const updated = await prisma.inviteCode.update({
            where: { code: code.toUpperCase().trim() },
            data: {
                label: label !== undefined ? label : undefined,
                allowedRoles: Array.isArray(allowedRoles) ? allowedRoles.join(',') : allowedRoles,
            }
        });
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/admin/invites?code=XXXXXXXX — delete an unused invite code
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    try {
        await prisma.inviteCode.delete({ where: { code: code.toUpperCase() } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
