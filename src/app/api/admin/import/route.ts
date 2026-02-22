import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/admin/import
// Body: { table: string, mode: 'merge' | 'replace', data: any[] }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { table, mode, data } = body;

        if (!table || !mode || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Required: table (string), mode ("merge"|"replace"), data (array)' }, { status: 400 });
        }

        if (!['merge', 'replace'].includes(mode)) {
            return NextResponse.json({ error: 'mode must be "merge" or "replace"' }, { status: 400 });
        }

        let count = 0;

        // Helper to strip relation fields — we only import scalar fields
        const stripRelations = (row: any, allowed: string[]) => {
            const cleaned: Record<string, any> = {};
            for (const key of allowed) {
                if (row[key] !== undefined) cleaned[key] = row[key];
            }
            return cleaned;
        };

        // Table-specific import handlers
        const importHandlers: Record<string, () => Promise<number>> = {
            users: async () => {
                const fields = ['id', 'username', 'password', 'role', 'frozen', 'deltaBalance', 'marginLimit', 'marginLoan', 'lendingLimit', 'lendingRate'];
                if (mode === 'replace') await prisma.user.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    await prisma.user.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            assets: async () => {
                const fields = ['id', 'symbol', 'name', 'type', 'sector', 'niche', 'description', 'supplyPool', 'demandPool', 'basePrice'];
                if (mode === 'replace') await prisma.asset.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    await prisma.asset.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            portfolios: async () => {
                const fields = ['id', 'userId', 'assetId', 'quantity', 'averageEntryPrice', 'isShortPosition', 'takeProfitPrice', 'stopLossPrice'];
                if (mode === 'replace') await prisma.portfolio.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    await prisma.portfolio.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            transactions: async () => {
                const fields = ['id', 'userId', 'assetId', 'type', 'amount', 'price', 'fee', 'timestamp'];
                if (mode === 'replace') await prisma.transaction.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    if (clean.timestamp) clean.timestamp = new Date(clean.timestamp);
                    await prisma.transaction.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            priceHistory: async () => {
                const fields = ['id', 'assetId', 'open', 'high', 'low', 'close', 'timestamp'];
                if (mode === 'replace') await prisma.priceHistory.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    if (clean.timestamp) clean.timestamp = new Date(clean.timestamp);
                    await prisma.priceHistory.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            news: async () => {
                const fields = ['id', 'headline', 'context', 'targetSector', 'targetSpecialty', 'impactScope', 'direction', 'intensityWeight', 'competitorInversion', 'publishedAt'];
                if (mode === 'replace') await prisma.newsStory.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    if (clean.publishedAt) clean.publishedAt = new Date(clean.publishedAt);
                    await prisma.newsStory.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            loans: async () => {
                const fields = ['id', 'lenderId', 'borrowerId', 'principal', 'interestRate', 'amountOwed', 'status', 'createdAt', 'updatedAt'];
                if (mode === 'replace') await prisma.loan.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    if (clean.createdAt) clean.createdAt = new Date(clean.createdAt);
                    if (clean.updatedAt) clean.updatedAt = new Date(clean.updatedAt);
                    await prisma.loan.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
            limitOrders: async () => {
                const fields = ['id', 'userId', 'assetId', 'type', 'quantity', 'price', 'leverage', 'status', 'createdAt'];
                if (mode === 'replace') await prisma.limitOrder.deleteMany();
                for (const row of data) {
                    const clean = stripRelations(row, fields);
                    if (!clean.id) continue;
                    if (clean.createdAt) clean.createdAt = new Date(clean.createdAt);
                    await prisma.limitOrder.upsert({
                        where: { id: clean.id },
                        update: clean,
                        create: clean as any,
                    });
                    count++;
                }
                return count;
            },
        };

        if (!importHandlers[table]) {
            return NextResponse.json({ error: `Unknown table: ${table}. Valid: ${Object.keys(importHandlers).join(', ')}` }, { status: 400 });
        }

        const imported = await importHandlers[table]();

        return NextResponse.json({ message: `${mode === 'replace' ? 'Replaced' : 'Merged'} ${imported} rows into "${table}"` });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ error: 'Import failed: ' + (error as Error).message }, { status: 500 });
    }
}
