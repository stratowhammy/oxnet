import React from 'react';
import prisma from "@/lib/db";
import Link from 'next/link';
import NewspaperLayout from './NewspaperLayout';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
    // Fetch the 12 most recent stories
    const recentStories = await prisma.newsStory.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 12
    });

    if (recentStories.length === 0) {
        return (
            <div className="min-h-screen bg-[#f4f1ea] text-black flex items-center justify-center font-serif">
                <div className="text-center flex flex-col items-center mt-8">
                    <div className="flex items-center justify-center gap-6 mb-4 max-w-4xl mx-auto border-b-4 border-black pb-4 px-8">
                        <div className="w-20 h-20 md:w-28 md:h-28 shrink-0">
                            <img src="/logo.png" alt="Market Master Logo" className="object-contain w-full h-full" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-left leading-tight">The Market Master<br />Journal</h1>
                    </div>
                    <p className="text-xl italic mt-4">The presses are quiet today. No news available.</p>
                    <Link href="/" className="mt-8 inline-block text-blue-800 hover:text-blue-600 underline text-sm font-sans uppercase tracking-widest">
                        Return to Exchange
                    </Link>
                </div>
            </div>
        );
    }

    // Determine the lead story: highest intensity from the most recent 6
    const top6 = recentStories.slice(0, 6);
    let leadStory = top6[0];
    for (let i = 1; i < top6.length; i++) {
        if (top6[i].intensityWeight > leadStory.intensityWeight) {
            leadStory = top6[i];
        }
    }

    // The rest of the stories (excluding the lead)
    const otherStories = recentStories.filter(s => s.id !== leadStory.id);

    return <NewspaperLayout leadStory={leadStory} otherStories={otherStories} />;
}
