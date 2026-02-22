import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/auth/register — Validate invite code, create a new user, return session
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code || code.length !== 8) {
            return NextResponse.json({ error: 'An 8-digit invite code is required' }, { status: 400 });
        }

        const upperCode = code.toUpperCase().trim();

        // Validate invite code
        const invite = await prisma.inviteCode.findUnique({ where: { code: upperCode } });
        if (!invite) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        }
        if (invite.used) {
            return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });
        }

        // Create a new user (no username/password yet — set during onboarding)
        const newUser = await prisma.user.create({
            data: {
                // No username or password — set during onboarding
                onboarded: false,
                playerRole: 'UNSET',
            }
        });

        // Mark code as used
        await prisma.inviteCode.update({
            where: { code: upperCode },
            data: {
                used: true,
                usedById: newUser.id,
                usedAt: new Date(),
            }
        });

        // Set session cookie
        const response = NextResponse.json({
            message: 'Account created. Proceed to role selection.',
            userId: newUser.id,
        });

        response.cookies.set('oxnet_session', newUser.id, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
