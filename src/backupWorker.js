import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const PRISMA_DIR = path.join(process.cwd(), 'prisma');
const SOURCE_DB_PATH = path.join(PRISMA_DIR, 'dev.db');
const BACKUPS_DIR = path.join(process.cwd(), 'public', 'backups');

// Ensure the publicly accessible backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export function initBackupWorker() {
    // Schedule to run every day at 00:00 (Midnight)
    cron.schedule('0 0 * * *', () => {
        performDatabaseSnapshot();
    });

    console.log("Database Backup Worker initialized (Cron 00:00).");
}

export function performDatabaseSnapshot() {
    console.log(`[${new Date().toISOString()}] Initiating SQLite Snapshot...`);
    try {
        if (!fs.existsSync(SOURCE_DB_PATH)) {
            console.error("Backup Failed: dev.db does not exist at", SOURCE_DB_PATH);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `backup_${timestamp}.db`;
        const destPath = path.join(BACKUPS_DIR, backupFilename);

        // Synchronously copy the file footprint
        fs.copyFileSync(SOURCE_DB_PATH, destPath);

        const stats = fs.statSync(destPath);
        const megabytes = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`[SNAPSHOT SUCCESS] Created ${backupFilename} (${megabytes} MB).`);
    } catch (e) {
        console.error("Database Snapshot Failed:", e);
    }
}
