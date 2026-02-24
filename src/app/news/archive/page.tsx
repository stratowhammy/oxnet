import React from 'react';
import prisma from "@/lib/db";
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
    // Fetch all stories EXCEPT the top 12 which are on the front page
    const allStories = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
    });

    const archivedStories = allStories.slice(12);

    return (
        <main className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] pb-20 font-serif">
            {/* Minimal Header */}
            <header className="border-b-4 border-black max-w-4xl mx-auto px-4 pt-12 pb-6 text-center select-none">
                <h1 className="text-4xl font-black uppercase tracking-widest mb-2" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
                    The Market Master Journal
                </h1>
                <div className="font-sans font-bold uppercase tracking-widest text-sm text-gray-500">
                    Historical Archives
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">

                <div className="mb-8 flex justify-between gap-4">
                    <Link href="/news" className="inline-block text-blue-900 border border-blue-900 hover:bg-blue-900 hover:text-white px-4 py-1 text-xs font-sans uppercase tracking-widest font-bold transition-colors">
                        ← Back to Front Page
                    </Link>
                </div>

                {archivedStories.length === 0 ? (
                    <div className="text-center py-20 italic text-gray-500">
                        The archives are currently empty. Check back when more history is written.
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {archivedStories.map((story) => (
                            <div key={story.id} className="border-b border-gray-300 pb-6 flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/4 shrink-0 text-sm font-sans font-bold uppercase text-gray-500 mt-1">
                                    <div>{new Date(story.publishedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-xs text-gray-400 mt-1">Sector: {story.targetSector}</div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black leading-tight mb-2">
                                        {story.headline}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-justify">
                                        {story.context.replace(/\*\*/g, '')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <footer className="max-w-4xl mx-auto px-4 mt-8 border-t-2 border-black pt-4 text-center text-sm italic">
                Preserved by the OxNet Arbitrage Engine.
            </footer>
        </main>
    );
}
