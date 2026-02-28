'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewspaperLayout({ leadStory, otherStories }: { leadStory: any, otherStories: any[] }) {
    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const router = useRouter();

    const closeModal = () => setSelectedNews(null);

    // Render clickable content function similar to the Dashboard
    const renderClickableContent = (content: string) => {
        if (!content) return null;

        // Pattern for markdown links: [Text](/?search=SOMETHING)
        const linkPattern = /\[([^\]]+)\]\(\/\?search=([^)]+)\)/g;
        const parts: (string | React.ReactNode)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = linkPattern.exec(content)) !== null) {
            // Push text before the link
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index));
            }

            const linkText = match[1];
            const searchQuery = match[2];

            parts.push(
                <button
                    key={`${match.index}-${searchQuery}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Close modal and navigate
                        closeModal();
                        router.push(`/?search=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="text-blue-400 hover:text-blue-300 underline font-bold transition-colors mx-1"
                >
                    {linkText}
                </button>
            );

            lastIndex = linkPattern.lastIndex;
        }

        // Push remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }

        // If no matches, return original text
        if (parts.length === 0) return content;

        return <>{parts}</>;
    };

    const getRelatedStories = (currentStory: any, allStories: any[]) => {
        if (!currentStory || !currentStory.tags) return [];
        let tags: string[] = [];
        try {
            tags = typeof currentStory.tags === 'string' ? JSON.parse(currentStory.tags) : currentStory.tags;
        } catch (e) {
            return [];
        }

        if (!Array.isArray(tags) || tags.length === 0) return [];

        // Score stories based on tag intersection
        const scoredStories = allStories
            .filter(s => s.id !== currentStory.id) // Exclude self
            .map(s => {
                let sTags: string[] = [];
                try {
                    sTags = typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags;
                } catch (e) { }
                const intersection = sTags.filter(t => tags.includes(t));
                return { story: s, score: intersection.length, sharedTags: intersection };
            })
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score || new Date(b.story.publishedAt).getTime() - new Date(a.story.publishedAt).getTime())
            .slice(0, 5);

        return scoredStories.map(s => s.story);
    };

    const renderModal = () => {
        if (!selectedNews) return null;

        const allStoriesArray = [leadStory, ...otherStories].filter(Boolean);
        const related = getRelatedStories(selectedNews, allStoriesArray);

        let parsedTags: string[] = [];
        try { parsedTags = typeof selectedNews.tags === 'string' ? JSON.parse(selectedNews.tags) : selectedNews.tags; } catch (e) { }

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-left" onClick={closeModal}>
                <div className="bg-gray-900 border border-gray-700 p-6 max-w-3xl w-full rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-900/40 text-blue-400 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded border border-blue-500/20">
                                    {selectedNews.targetSector}
                                </span>
                                <span className="bg-purple-900/40 text-purple-400 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded border border-purple-500/20">
                                    {selectedNews.targetSpecialty}
                                </span>
                            </div>
                            <h2 className={`text-2xl font-bold leading-tight ${selectedNews.direction === 'UP' ? 'text-green-500' : 'text-red-500'}`}>{selectedNews.headline}</h2>
                            {selectedNews.outlet && selectedNews.reporter && (
                                <div className="text-gray-400 text-sm font-semibold italic mt-1">
                                    By {selectedNews.reporter} | <span className="text-gray-500">{selectedNews.outlet}</span>
                                </div>
                            )}
                            <p className="text-gray-500 text-xs mt-2">{new Date(selectedNews.publishedAt).toLocaleString()}</p>
                        </div>
                        <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors p-1">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-6 text-gray-300 text-sm">
                        <div className="bg-gray-950 p-5 rounded-xl text-[15px] leading-relaxed border border-gray-800">
                            {renderClickableContent(selectedNews.context)}
                        </div>

                        {Array.isArray(parsedTags) && parsedTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                <span className="text-gray-500 text-xs py-1">TAGS:</span>
                                {parsedTags.map(tag => (
                                    <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full border border-gray-700">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {related.length > 0 && (
                            <div className="mt-8 border-t border-gray-800 pt-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-gray-500">↳</span> Related Stories
                                </h3>
                                <div className="space-y-3">
                                    {related.map(rel => (
                                        <div
                                            key={rel.id}
                                            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 p-4 rounded-lg cursor-pointer transition-colors group"
                                            onClick={() => setSelectedNews(rel)}
                                        >
                                            <h4 className="text-white font-semibold group-hover:text-blue-400 transition-colors">{rel.headline}</h4>
                                            <p className="text-gray-400 text-xs mt-1 truncate">{rel.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const allDisplayStories = [leadStory, ...otherStories].filter(Boolean);

    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-4 md:p-8">
            {renderModal()}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 opacity-80 filter invert">
                                <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
                        </div>
                        <p className="text-gray-400 text-sm">Global economic events, analysis, and breaking sector movements.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/news/archive" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold flex items-center gap-2 py-2 px-4 rounded transition-colors text-sm border border-gray-700">
                            News Archive
                        </Link>
                        <Link href="/" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold flex items-center gap-2 py-2 px-4 rounded transition-colors text-sm border border-gray-700">
                            <span>←</span> Exchange Dashboard
                        </Link>
                    </div>
                </header>

                {/* News Feed List */}
                <div className="space-y-4">
                    {allDisplayStories.map((story) => {
                        let parsedTags: string[] = [];
                        try { parsedTags = typeof story.tags === 'string' ? JSON.parse(story.tags) : story.tags; } catch (e) { }

                        return (
                            <div
                                key={story.id}
                                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 cursor-pointer transition-all group shadow-sm hover:shadow-md hover:shadow-blue-900/5"
                                onClick={() => setSelectedNews(story)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`text-xl font-bold transition-colors pr-4 ${story.direction === 'UP' ? 'text-green-400 group-hover:text-green-300' : 'text-red-400 group-hover:text-red-300'}`}>
                                        {story.headline}
                                    </h3>
                                    <div className="text-xs text-gray-500 whitespace-nowrap mt-1">
                                        {new Date(story.publishedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                {story.outlet && story.reporter && (
                                    <div className="text-gray-400 text-xs font-semibold italic mb-3">
                                        By {story.reporter} | <span className="text-gray-500">{story.outlet}</span>
                                    </div>
                                )}

                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {story.summary || story.context}
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${story.impactScope === 'SECTOR' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20' : 'bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-500/20'}`}>
                                        {story.impactScope}
                                    </span>

                                    {Array.isArray(parsedTags) && parsedTags.map(tag => (
                                        <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
