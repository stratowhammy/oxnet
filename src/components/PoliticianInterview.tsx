import React, { useState, useEffect } from 'react';

interface Politician {
    id: string;
    username: string;
    politicalRank: number;
    backstory: string | null;
    traits: string | null;
    philosophy: string | null;
    isNPC: boolean;
}

interface Policy {
    id: string;
    title: string;
    description: string;
    policyType: string;
    votesFor: number;
    votesAgainst: number;
    endsAt: string;
    proposer: { username: string; politicalRank: number };
}

const RANK_LABELS: Record<number, string> = {
    0: 'Candidate',
    1: 'Council',
    2: 'Representative',
    3: 'Senator',
    4: 'President'
};

export default function PoliticianInterview({ user }: { user: any }) {
    const [politicians, setPoliticians] = useState<Politician[]>([]);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const fetchData = async () => {
        try {
            const [pRes, polRes] = await Promise.all([
                fetch('/api/politics/officials?minRank=2'),
                fetch('/api/politics/policies/active')
            ]);
            const pData = await pRes.json();
            const polData = await polRes.json();

            if (Array.isArray(pData)) setPoliticians(pData.filter(u => u.isNPC));
            if (Array.isArray(polData)) setPolicies(polData);
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const selected = politicians.find(p => p.id === selectedId);

    const handleAsk = async () => {
        if (!selectedId || !question.trim()) return;
        setLoading(true);
        setAnswer('');
        try {
            const res = await fetch('/api/politics/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ politicianId: selectedId, question })
            });
            const data = await res.json();
            if (data.answer) setAnswer(data.answer);
            else setAnswer('I have no comment on that matter.');
        } catch {
            setAnswer('Transmission interrupted.');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (policyId: string, voteType: 'FOR' | 'AGAINST') => {
        if (!user || user.politicalRank < 2) return;
        setLoading(true);
        try {
            const res = await fetch('/api/politics/policies/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, proposalId: policyId, voteType })
            });
            const data = await res.json();
            if (res.ok) {
                fetchData(); // Refresh list
            } else {
                alert(data.error || 'Voting failed');
            }
        } catch {
            alert('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-gray-500 animate-pulse">Scanning federal frequency...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full pb-20">
            {/* Left Column: Registry & Feed */}
            <div className="md:col-span-4 space-y-8 overflow-y-auto pr-2" style={{ maxHeight: '85vh' }}>

                {/* Registry */}
                <section>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Federal Registry
                    </h3>
                    <div className="space-y-3">
                        {politicians.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setSelectedId(p.id); setAnswer(''); setQuestion(''); }}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === p.id
                                    ? 'bg-purple-900/20 border-purple-500 shadow-lg shadow-purple-900/20'
                                    : 'bg-black/40 border-gray-800 hover:border-gray-700'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-white text-sm">{p.username}</div>
                                    <div className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase font-bold tracking-tighter">
                                        {RANK_LABELS[p.politicalRank] || 'Official'}
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-500 line-clamp-1 italic">"{p.philosophy}"</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Legislative Feed */}
                <section>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Legislative Session
                    </h3>
                    <div className="space-y-4">
                        {policies.length === 0 ? (
                            <div className="p-4 rounded-xl border border-gray-800 bg-black/20 text-[10px] text-gray-600 uppercase font-bold text-center">
                                No active proposals
                            </div>
                        ) : (
                            policies.map(p => (
                                <div key={p.id} className="p-4 rounded-xl border border-gray-800 bg-black/40 group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-black text-white text-xs uppercase tracking-tight">{p.title}</div>
                                        <div className="text-[9px] text-blue-400 font-bold uppercase tracking-widest bg-blue-900/20 px-2 py-0.5 rounded">
                                            {p.policyType}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-3 line-clamp-2 leading-relaxed">{p.description}</p>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-1000"
                                                style={{ width: `${(p.votesFor / (p.votesFor + p.votesAgainst || 1)) * 100}%` }}
                                            />
                                            <div
                                                className="h-full bg-red-500 transition-all duration-1000"
                                                style={{ width: `${(p.votesAgainst / (p.votesFor + p.votesAgainst || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-500">
                                            {p.votesFor + p.votesAgainst} Votes
                                        </div>
                                    </div>

                                    {user && user.politicalRank >= 2 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVote(p.id, 'FOR')}
                                                disabled={loading}
                                                className="flex-1 py-1.5 rounded-lg bg-green-900/20 border border-green-900/50 text-green-500 text-[10px] font-black uppercase hover:bg-green-500 hover:text-white transition-all"
                                            >
                                                Aye
                                            </button>
                                            <button
                                                onClick={() => handleVote(p.id, 'AGAINST')}
                                                disabled={loading}
                                                className="flex-1 py-1.5 rounded-lg bg-red-900/20 border border-red-900/50 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                Nay
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Right Column: Interaction Space */}
            <div className="md:col-span-8 flex flex-col">
                {selected ? (
                    <div className="flex flex-col h-full bg-black/60 border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />

                        <div className="mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl shadow-xl">
                                    🏛️
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{selected.username}</h2>
                                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">{RANK_LABELS[selected.politicalRank]}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Philosophy</div>
                                    <div className="text-xs text-gray-300">{selected.philosophy}</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Traits</div>
                                    <div className="text-xs text-gray-300">{selected.traits}</div>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed border-l-2 border-gray-800 pl-4">{selected.backstory}</p>
                        </div>

                        {/* Dialogue Area */}
                        <div className="flex-1 bg-black/40 rounded-xl p-4 border border-gray-800/50 mb-4 overflow-y-auto min-h-[200px]">
                            {answer ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="text-[10px] text-purple-500 uppercase font-black mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                        Official Statement
                                    </div>
                                    <p className="text-md text-gray-200 leading-relaxed font-serif italic text-lg">"{answer}"</p>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-xs uppercase tracking-widest font-bold text-center">
                                    Secure terminal established.<br />Awaiting direct inquiry...
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                                placeholder={`Ask the ${RANK_LABELS[selected.politicalRank]} a question...`}
                                className="flex-1 bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all text-sm"
                                disabled={loading}
                            />
                            <button
                                onClick={handleAsk}
                                disabled={loading || !question.trim()}
                                className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${loading || !question.trim()
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95'}`}
                            >
                                {loading ? '...' : 'Inquire'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl bg-black/20">
                        <div className="text-center">
                            <div className="text-4xl mb-4 opacity-20">🏛️</div>
                            <div className="text-xs text-gray-600 font-black uppercase tracking-[0.3em]">Select an official to engage</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
