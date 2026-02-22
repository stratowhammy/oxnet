import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/admin/users — List all users with portfolios
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            include: {
                portfolios: {
                    include: { asset: true }
                }
            },
            orderBy: { username: 'asc' }
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Admin users GET error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/admin/users — Create a single user
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, role, deltaBalance } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Check for duplicate username
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ error: `Username "${username}" already exists` }, { status: 409 });
        }

        const user = await prisma.user.create({
            data: {
                username,
                password,
                role: role || 'STUDENT',
                deltaBalance: deltaBalance ?? 100000.0
            }
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("Admin users POST error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
