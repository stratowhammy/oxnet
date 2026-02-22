import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/auth/invite/validate — Validate code and return allowed roles (without creating user)
export async function POST(request: Request) {
    try {
        const { code } = await request.json();

        if (!code || code.length !== 8) {
            return NextResponse.json({ error: 'An 8-character invite code is required' }, { status: 400 });
        }

        const upperCode = code.toUpperCase().trim();
        const invite = await prisma.inviteCode.findUnique({ where: { code: upperCode } });

        if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        if (invite.used) return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });

        // Return which roles this code unlocks
        const allowedRoles = invite.allowedRoles
            .split(',')
            .map((r: string) => r.trim())
            .filter((r: string) => r.length > 0);

        return NextResponse.json({ valid: true, allowedRoles, label: invite.label });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
