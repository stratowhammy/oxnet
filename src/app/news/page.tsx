import prisma from '@/lib/db';
import React from 'react';

// NextJS 14 component
export default async function PublicNewsDashboard() {
    // 1. Fetch exactly the 12 most recent published stories
    const rawNews = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 12
    });

    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10 px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Market Intelligence Hub</h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time macro-economic analysis and sector disruptions.</p>
                </div>
                <div className="flex gap-4">
                    <a href="/" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm border border-gray-700 shadow-sm">
                        Go to Exchange
                    </a>
                </div>
            </header>

            {/* Container */}
            <div className="max-w-7xl mx-auto px-8 py-10">

                {rawNews.length === 0 ? (
                    <div className="text-center py-24 text-gray-500 text-lg">
                        The Central Bank has not published any intelligence reports yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {rawNews.map(story => {
                            // Extract the two halves of the content split by our literal markdown text.
                            // The generator injects "\n\n**Economic Impact**\n\n" exactly.
                            let scenario = story.context;
                            let impact = "";

                            const separator = "\n\n**Economic Impact**\n\n";
                            if (story.context.includes(separator)) {
                                const parts = story.context.split(separator);
                                scenario = parts[0];
                                impact = parts[1];
                            } else {
                                // Fallback just in case old db records slip through
                                const oldSplit = story.context.split(". ");
                                if (oldSplit.length > 2) {
                                    scenario = oldSplit.slice(0, 2).join(". ") + ".";
                                    impact = oldSplit.slice(2).join(". ");
                                }
                            }

                            return (
                                <article key={story.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-gray-700 transition-colors">
                                    {/* Card Header Strip */}
                                    <div className={`h-2 w-full ${story.direction === 'UP' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex gap-2 text-xs font-bold mb-3 uppercase tracking-wider">
                                            <span className="text-blue-400">{story.targetSector}</span>
                                            <span className="text-gray-600">•</span>
                                            <span className="text-gray-400 truncate max-w-[150px]">{story.targetSpecialty}</span>
                                        </div>

                                        <h2 className="text-xl font-bold text-white leading-snug mb-4">
                                            {story.headline}
                                        </h2>

                                        <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">
                                            {scenario}
                                        </p>

                                        {/* Economic Impact Block */}
                                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 mt-auto">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                Economic Impact
                                            </h3>
                                            <p className="text-sm text-gray-300 leading-relaxed italic">
                                                {impact || scenario}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-950 px-6 py-3 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
                                        <span>Intensity: {story.intensityWeight}/5</span>
                                        <span>{new Date(story.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
