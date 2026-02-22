import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const bcryptjs = require('bcryptjs');

// POST /api/auth/register — Validate invite, create user with chosen role, callsign, and passphrase
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, playerRole, username, password } = body;

        if (!code || code.length !== 8) {
            return NextResponse.json({ error: 'An 8-character invite code is required' }, { status: 400 });
        }
        if (!playerRole) {
            return NextResponse.json({ error: 'A role selection is required' }, { status: 400 });
        }
        if (!username || username.trim().length < 3) {
            return NextResponse.json({ error: 'Callsign must be at least 3 characters' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Passphrase must be at least 6 characters' }, { status: 400 });
        }

        const upperCode = code.toUpperCase().trim();

        // Validate invite code
        const invite = await prisma.inviteCode.findUnique({ where: { code: upperCode } });
        if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        if (invite.used) return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });

        // Validate chosen role against invite's allowed roles
        const allowedRoles = (invite as any).allowedRoles.split(',').map((r: string) => r.trim());
        if (!allowedRoles.includes(playerRole)) {
            return NextResponse.json({ error: `Role "${playerRole}" is not allowed by this invite code` }, { status: 403 });
        }

        // Check callsign uniqueness
        const existingUser = await prisma.user.findFirst({ where: { username: username.trim() } });
        if (existingUser) {
            return NextResponse.json({ error: 'That callsign is already taken. Choose another.' }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Create fully-onboarded user
        const newUser = await prisma.user.create({
            data: {
                username: username.trim(),
                password: hashedPassword,
                playerRole,
                onboarded: true,
            }
        });

        // Mark code as used
        await prisma.inviteCode.update({
            where: { code: upperCode },
            data: { used: true, usedById: newUser.id, usedAt: new Date() }
        });

        // Set session cookie
        const response = NextResponse.json({
            message: 'Character created. Welcome to OxNet.',
            userId: newUser.id,
            playerRole,
        });

        response.cookies.set('oxnet_session', newUser.id, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
