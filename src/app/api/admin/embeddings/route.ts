import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addContextMaterial, clearRagStore, getRagStoreStats } from '@/lib/rag.js';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Ensure Admin Role
        const authHeader = req.headers.get('authorization');
        if (!authHeader || authHeader !== 'Bearer admin-secret-key-123') {
            // Simplified auth check for demo purposes. Adjust to real auth if needed.
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (body.action === 'flush') {
            clearRagStore();
            console.log("[RAG] Context flushed by Admin.");
            return NextResponse.json({ success: true, message: "RAG Context Flushed.", stats: getRagStoreStats() });
        }

        if (body.action === 'rebuild') {
            clearRagStore(); // Reset before re-indexing

            // 1. Load Asset Descriptions
            const assets = await prisma.asset.findMany();
            console.log(`[RAG] Embedding ${assets.length} Assets...`);
            for (const asset of assets) {
                // Construct a dense semantic string
                const text = `Company: ${asset.name} (${asset.symbol})\nSector: ${asset.sector}\nSpecialty: ${asset.niche}\nDescription: ${asset.description}\nCurrent Price: $${asset.basePrice}`;
                await addContextMaterial('ASSET_DESCRIPTION', asset.id, text);
            }

            // 2. Load latest News Stories (Limit 150 to save time/tokens)
            const news = await prisma.newsStory.findMany({
                take: 150,
                orderBy: { publishedAt: 'desc' }
            });
            console.log(`[RAG] Embedding ${news.length} News Stories...`);
            for (const story of news) {
                const text = `Headline: ${story.headline}\nDate: ${story.publishedAt}\nImpact: ${story.direction} (${story.intensityWeight}/5) in ${story.targetSector}\nStory: ${story.context}`;
                await addContextMaterial('NEWS_STORY', story.id, text);
            }

            console.log("[RAG] Full database context rebuild complete.");
            return NextResponse.json({
                success: true,
                message: "RAG Context Rebuilt Successfully.",
                stats: getRagStoreStats()
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (e: any) {
        console.error("Failed to manage RAG context:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
