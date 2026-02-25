import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const symbol = (await params).symbol;
        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        // Search for news where the tags JSON string contains the exact symbol
        // For SQLite, tags is a simple String? so we search for exactly `"${symbol}"`
        const news = await prisma.newsStory.findMany({
            where: {
                tags: {
                    contains: `"${symbol}"`
                }
            },
            orderBy: {
                publishedAt: 'desc'
            },
            take: 10
        });

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news by symbol:", error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
