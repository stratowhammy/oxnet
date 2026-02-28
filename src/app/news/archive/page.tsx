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
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-4 md:p-8 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 opacity-80 filter invert">
                                <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Market Intelligence Archive</h1>
                        </div>
                        <p className="text-gray-400 text-sm">Historical records of all globally reaching intelligence reports.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/news" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold flex items-center gap-2 py-2 px-4 rounded transition-colors text-sm border border-gray-700">
                            <span>←</span> Back to Front Page
                        </Link>
                    </div>
                </header>

                <div className="space-y-4">
                    {archivedStories.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 italic">
                            The archives are currently empty. Check back when more history is written.
                        </div>
                    ) : (
                        archivedStories.map((story) => {
                            let parsedTags: string[] = [];
                            try { parsedTags = typeof story.tags === 'string' ? JSON.parse(story.tags) : story.tags; } catch (e) { }

                            return (
                                <div key={story.id} className="bg-gray-900/50 border border-gray-800/80 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`text-xl font-bold transition-colors pr-4 ${story.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                                            {story.headline}
                                        </h3>
                                        <div className="text-xs text-gray-500 whitespace-nowrap mt-1">
                                            {new Date(story.publishedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {story.outlet && story.reporter && (
                                        <div className="text-gray-400 text-xs font-semibold italic mb-4">
                                            By {story.reporter} | <span className="text-gray-500">{story.outlet}</span>
                                        </div>
                                    )}

                                    <div className="text-gray-300 text-sm leading-relaxed mb-4 text-justify">
                                        {story.context.replace(/\*\*/g, '')}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${story.impactScope === 'SECTOR' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20' : 'bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-500/20'}`}>
                                            {story.targetSector} • {story.impactScope}
                                        </span>
                                        {Array.isArray(parsedTags) && parsedTags.map(tag => (
                                            <span key={tag} className="text-xs text-gray-600">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <footer className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
                    Preserved by the OxNet Arbitrage Engine.
                </footer>
            </div>
        </main>
    );
}
