import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Store backups functionally in /public so they can be straight requested via HTTP if needed
const BACKUPS_DIR = path.join(process.cwd(), 'public', 'backups');
const ACTIVE_DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

export async function GET() {
    try {
        if (!fs.existsSync(BACKUPS_DIR)) {
            return NextResponse.json({ backups: [] });
        }

        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.endsWith('.db'))
            .map(file => {
                const stats = fs.statSync(path.join(BACKUPS_DIR, file));
                return {
                    filename: file,
                    sizeBytes: stats.size,
                    createdAt: stats.birthtime.toISOString(),
                };
            })
            // Sort by newest first
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ backups: files });
    } catch (e: any) {
        console.error('Failed to list backups:', e);
        return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // Warning: Destructive Action
        const { filename } = await req.json();

        if (!filename || !filename.endsWith('.db')) {
            return NextResponse.json({ error: 'Invalid backup file requested' }, { status: 400 });
        }

        const restoreTarget = path.join(BACKUPS_DIR, filename);

        if (!fs.existsSync(restoreTarget)) {
            return NextResponse.json({ error: 'Backup snapshot not found on disk' }, { status: 404 });
        }

        console.log(`[RESTORE WARNING]: Restoring active db from snapshot: ${filename}`);

        // Ensure dev.db exists before attempting to replace it
        if (!fs.existsSync(ACTIVE_DB_PATH)) {
            // Unlikely if app is running, but safety check.
            fs.copyFileSync(restoreTarget, ACTIVE_DB_PATH);
        } else {
            // Remove the live file and replace with snapshot
            fs.unlinkSync(ACTIVE_DB_PATH);
            fs.copyFileSync(restoreTarget, ACTIVE_DB_PATH);
        }

        console.log(`[RESTORE SUCCESS]: System rolled back to ${filename}`);

        return NextResponse.json({ message: 'Database successfully restored. Restarting Prisma connection is highly recommended.' });
    } catch (e: any) {
        console.error('Failed to restore database:', e);
        return NextResponse.json({ error: 'Failed to execute restoration protocol.' }, { status: 500 });
    }
}
