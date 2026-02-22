import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/admin/users/bulk — Bulk import users from CSV data
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { users } = body; // Expects: { users: [{ username, password }, ...] }

        if (!Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'Expected a non-empty array of users' }, { status: 400 });
        }

        const results: { username: string; status: string }[] = [];

        for (const u of users) {
            if (!u.username || !u.password) {
                results.push({ username: u.username || '(empty)', status: 'SKIPPED — missing username or password' });
                continue;
            }

            const existing = await prisma.user.findUnique({ where: { username: u.username } });
            if (existing) {
                results.push({ username: u.username, status: 'SKIPPED — already exists' });
                continue;
            }

            await prisma.user.create({
                data: {
                    username: u.username,
                    password: u.password,
                    role: 'STUDENT',
                    deltaBalance: 100000.0
                }
            });
            results.push({ username: u.username, status: 'CREATED' });
        }

        const created = results.filter(r => r.status === 'CREATED').length;
        return NextResponse.json({ message: `${created} of ${users.length} users created`, results });
    } catch (error) {
        console.error("Admin bulk import error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
