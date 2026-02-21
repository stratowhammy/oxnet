'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function NewspaperLayout({ leadStory, otherStories }: { leadStory: any, otherStories: any[] }) {
    const [selectedNews, setSelectedNews] = useState<any | null>(null);

    const closeModal = () => setSelectedNews(null);

    const renderModal = () => {
        if (!selectedNews) return null;

        // Extract scenario and impact if needed
        let scenario = selectedNews.context;
        let impact = "";
        const separator = "\n\n**Expected Economic Outcome**\n\n";

        if (selectedNews.context.includes(separator)) {
            const parts = selectedNews.context.split(separator);
            scenario = parts[0];
            impact = parts[1];
        }

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-white text-left" onClick={closeModal}>
                <div className="bg-gray-900 border-2 border-gray-700 p-6 max-w-2xl w-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                        <div>
                            <div className="flex gap-2 items-center mb-1">
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${selectedNews.direction === 'UP' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                    {selectedNews.direction} OUTLOOK
                                </span>
                                <span className="text-gray-400 text-xs">Level {selectedNews.intensityWeight} Intensity</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mt-1">{selectedNews.headline}</h2>
                        </div>
                        <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-gray-300 relative text-sm">
                        <div className="flex items-center gap-4 text-xs font-mono bg-black/50 p-2 rounded text-gray-400 mb-4">
                            <div><span className="text-gray-500">SECTOR:</span> {selectedNews.targetSector}</div>
                            <div><span className="text-gray-500">NICHE:</span> {selectedNews.targetSpecialty}</div>
                            <div><span className="text-gray-500">SCOPE:</span> {selectedNews.impactScope}</div>
                        </div>

                        <div className="bg-gray-800/50 p-4 rounded-xl text-[15px] leading-relaxed relative">
                            {scenario}
                        </div>

                        {impact && (
                            <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl">
                                <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Expected Economic Impact</h3>
                                <p className="text-sm italic">{impact}</p>
                            </div>
                        )}

                        {selectedNews.competitorInversion && (
                            <div className="mt-4 bg-yellow-900/20 border border-yellow-700/50 p-3 rounded text-sm text-yellow-500 flex items-center gap-2">
                                ⚠ Competitor Inversion Detected: Rival firms seeing opposite effect.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] pb-20 relative">
            {renderModal()}

            {/* Newspaper Header */}
            <header className="border-b-8 border-double border-black max-w-6xl mx-auto px-4 pt-12 pb-6 select-none">

                <div className="flex items-center justify-center gap-6 mb-4 max-w-4xl mx-auto">
                    {/* Logo positioning */}
                    <div className="w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 shrink-0">
                        <img src="/logo.png" alt="Market Master Logo" className="object-contain w-full h-full" />
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black uppercase font-serif tracking-tighter leading-none text-left" style={{ fontFamily: "'Playfair Display', 'Merriweather', serif" }}>
                        The Market Master<br />Journal
                    </h1>
                </div>

                <div className="flex justify-between items-center border-t-2 border-b-2 border-black py-2 font-serif text-sm font-bold uppercase tracking-widest">
                    <span>Vol. CXXIV ... No. 59,102</span>
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span>Price: 10 Cents</span>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8">

                <div className="mb-4 flex justify-between gap-4">
                    <Link href="/" className="inline-block text-blue-900 border border-blue-900 hover:bg-blue-900 hover:text-white px-4 py-1 text-xs font-sans uppercase tracking-widest font-bold transition-colors">
                        ← Return to Exchange
                    </Link>
                    <Link href="/news/archive" className="inline-block text-gray-700 border border-gray-700 hover:bg-gray-700 hover:text-white px-4 py-1 text-xs font-sans uppercase tracking-widest font-bold transition-colors">
                        View History Archive →
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Lead Story Column (Spans 8 cols on desktop) */}
                    <div className="md:col-span-8 border-r-0 md:border-r-2 border-black md:pr-8">
                        <div
                            className="mb-8 pb-8 border-b-4 border-black cursor-pointer group hover:bg-black/5 p-4 -m-4 rounded transition-colors"
                            onClick={() => setSelectedNews(leadStory)}
                        >
                            <h2 className="text-5xl md:text-7xl font-black font-serif uppercase leading-none mb-6 text-center group-hover:underline decoration-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                                {leadStory.headline}
                            </h2>
                            <div className="flex justify-center gap-4 mb-6 font-sans text-xs uppercase tracking-widest font-bold border-y border-black py-2">
                                <span>Sector: {leadStory.targetSector}</span>
                                <span>•</span>
                                <span>Impact: {leadStory.impactScope}</span>
                                <span>•</span>
                                <span className={leadStory.direction === 'UP' ? 'text-green-800' : 'text-red-800'}>
                                    Outlook: {leadStory.direction} (Level {leadStory.intensityWeight})
                                </span>
                            </div>

                            <div className="font-serif text-lg leading-relaxed columns-1 md:columns-2 gap-8 text-justify">
                                <span className="float-left text-7xl leading-none font-black pr-2 pt-2 -ml-1 uppercase">
                                    {leadStory.context.charAt(0)}
                                </span>
                                {leadStory.context.substring(1).split('\n\n').map((paragraph: string, idx: number) => (
                                    <p key={idx} className="mb-4 break-inside-avoid">
                                        {paragraph.replace(/\*\*/g, '')}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Secondary Stories / Bottom Half of Lead Column */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {otherStories.slice(0, 4).map((story) => (
                                <div
                                    key={story.id}
                                    className="border-t border-gray-400 pt-4 cursor-pointer group hover:bg-black/5 p-2 -m-2 rounded transition-colors"
                                    onClick={() => setSelectedNews(story)}
                                >
                                    <h3 className="text-2xl font-black font-serif leading-tight mb-2 group-hover:underline">
                                        {story.headline}
                                    </h3>
                                    <div className="text-xs font-sans font-bold uppercase mb-3 text-gray-600">
                                        {story.targetSpecialty} — {story.direction}
                                    </div>
                                    <p className="font-serif text-sm leading-relaxed text-justify line-clamp-6">
                                        {story.context.replace(/\*\*/g, '')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Stories (Spans 4 cols on desktop) */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <div className="bg-gray-200 border-2 border-black p-4 mb-4 text-center">
                            <h3 className="font-black font-serif uppercase tracking-widest text-xl mb-1 mt-1">Market Watch</h3>
                            <p className="font-serif text-sm italic">Continuous undeniable coverage.</p>
                        </div>

                        {otherStories.slice(4).map((story, i) => (
                            <div
                                key={story.id}
                                className={`pb-6 cursor-pointer group hover:bg-black/5 p-2 -m-2 rounded transition-colors ${i !== otherStories.length - 5 ? 'border-b border-gray-400' : ''}`}
                                onClick={() => setSelectedNews(story)}
                            >
                                <h4 className="text-xl font-black font-serif leading-tight mb-2 group-hover:underline">
                                    {story.headline}
                                </h4>
                                <div className="text-[10px] font-sans font-bold uppercase tracking-wider mb-2 text-gray-500">
                                    Sector: {story.targetSector} • Int: {story.intensityWeight}
                                </div>
                                <p className="font-serif text-sm leading-relaxed text-justify line-clamp-4">
                                    {story.context.replace(/\*\*/g, '')}
                                </p>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            <footer className="max-w-6xl mx-auto px-4 mt-8 border-t-4 border-black pt-4 text-center font-serif text-sm italic">
                Printed dynamically by the OxNet Arbitrage Engine. All events simulated.
            </footer>
        </main>
    );
}
