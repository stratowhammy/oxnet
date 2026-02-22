import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const TABLE_EXPORTERS: Record<string, () => Promise<any>> = {
    users: () => prisma.user.findMany(),
    assets: () => prisma.asset.findMany(),
    portfolios: () => prisma.portfolio.findMany({ include: { asset: { select: { symbol: true, name: true } } } }),
    transactions: () => prisma.transaction.findMany(),
    priceHistory: () => prisma.priceHistory.findMany(),
    news: () => prisma.newsStory.findMany(),
    loans: () => prisma.loan.findMany(),
    limitOrders: () => prisma.limitOrder.findMany(),
    goalCards: () => prisma.goalCard.findMany(),
    goalAuctions: () => prisma.goalAuction.findMany(),
    userGoals: () => prisma.userGoal.findMany(),
};

// GET /api/admin/export?table=users|assets|all|...
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table') || 'all';

        let data: Record<string, any>;

        if (table === 'all') {
            data = {};
            for (const [name, fetcher] of Object.entries(TABLE_EXPORTERS)) {
                data[name] = await fetcher();
            }
        } else if (TABLE_EXPORTERS[table]) {
            data = { [table]: await TABLE_EXPORTERS[table]() };
        } else {
            return NextResponse.json({ error: `Unknown table: ${table}. Valid: ${Object.keys(TABLE_EXPORTERS).join(', ')}, all` }, { status: 400 });
        }

        const filename = `oxnet_export_${table}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        return new NextResponse(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
