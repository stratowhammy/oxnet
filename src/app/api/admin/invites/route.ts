import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/I/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// GET /api/admin/invites — List all invite codes
export async function GET() {
    const cookieStore = await cookies();
    const session = cookieStore.get('oxnet_session');
    if (!session?.value) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.value } });
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const codes = await prisma.inviteCode.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ codes });
}

// POST /api/admin/invites — Generate new invite codes
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');
        if (!session?.value) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: session.value } });
        if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const count = Math.min(Math.max(parseInt(body.count) || 1, 1), 99);

        const generated: string[] = [];

        for (let i = 0; i < count; i++) {
            let code = generateCode();
            // Ensure uniqueness
            let attempts = 0;
            while (attempts < 10) {
                const exists = await prisma.inviteCode.findUnique({ where: { code } });
                if (!exists) break;
                code = generateCode();
                attempts++;
            }

            await prisma.inviteCode.create({
                data: { code }
            });
            generated.push(code);
        }

        return NextResponse.json({
            message: `Generated ${generated.length} invite code(s)`,
            codes: generated,
        });
    } catch (error) {
        console.error('Invite generation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
