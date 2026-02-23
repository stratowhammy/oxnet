'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MunicipalEventData {
    id: string;
    municipalityId: string;
    eventType: string;
    title: string;
    content: string;
    publishedAt: string;
    municipality: { name: string };
}

interface ElectionData {
    id: string;
    electionType: string;
    status: string;
    votingStart: string;
    votingEnd: string;
    hasVoted: boolean;
    municipality: { name: string };
    candidates: {
        id: string;
        isNpc: boolean;
        npcName: string | null;
        npcBio: string | null;
        voteCount: number;
        user: { username: string; playerRole: string } | null;
    }[];
}

const EVENT_ICONS: Record<string, string> = {
    NEWS: '📰',
    ELECTION: '🗳️',
    MAYOR_DECISION: '🏛️',
    ANNOUNCEMENT: '📢',
};

const RANK_LABELS: Record<string, string> = {
    COUNCIL: 'City Council',
    REPRESENTATIVE: 'Representative',
    SENATOR: 'Senator',
    PRESIDENT: 'President',
};

export default function MunicipalEvents() {
    const [events, setEvents] = useState<MunicipalEventData[]>([]);
    const [elections, setElections] = useState<ElectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingFor, setVotingFor] = useState<string | null>(null);
    const [voteMessage, setVoteMessage] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [eventsRes, electionsRes] = await Promise.all([
                fetch('/api/municipal-events'),
                fetch('/api/elections')
            ]);
            if (eventsRes.ok) setEvents(await eventsRes.json());
            if (electionsRes.ok) setElections(await electionsRes.json());
        } catch (e) {
            console.error('Failed to fetch municipal data:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const castVote = async (electionId: string, candidateId: string) => {
        setVotingFor(candidateId);
        setVoteMessage('');
        try {
            const res = await fetch('/api/elections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ electionId, candidateId })
            });
            const data = await res.json();
            if (res.ok) {
                setVoteMessage('✓ Vote cast successfully!');
                fetchData();
            } else {
                setVoteMessage(`✗ ${data.error}`);
            }
        } catch {
            setVoteMessage('✗ Network error');
        } finally {
            setVotingFor(null);
        }
    };

    // Active voting elections
    const votingElections = elections.filter(e => e.status === 'VOTING' && !e.hasVoted);

    if (loading) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm animate-pulse">Loading municipal events...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Voting Prompt (if elections are active) */}
            {votingElections.length > 0 && (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-5 animate-pulse-slow">
                    <h3 className="text-lg font-black text-white mb-3 uppercase tracking-widest flex items-center gap-2">
                        🗳️ Election Day — Cast Your Vote!
                    </h3>
                    {voteMessage && (
                        <div className={`text-sm mb-3 font-bold ${voteMessage.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                            {voteMessage}
                        </div>
                    )}
                    {votingElections.map(election => (
                        <div key={election.id} className="mb-4 last:mb-0">
                            <div className="text-sm text-gray-300 mb-2">
                                <span className="text-purple-400 font-bold">{RANK_LABELS[election.electionType] || election.electionType}</span>
                                {' '}election in <span className="text-cyan-400 font-bold">{election.municipality.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-3">
                                Voting ends: {new Date(election.votingEnd).toLocaleString()}
                            </div>
                            <div className="space-y-2">
                                {election.candidates.map(candidate => (
                                    <div key={candidate.id}
                                        className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-purple-500/50 transition-colors">
                                        <div>
                                            <div className="font-bold text-white text-sm">
                                                {candidate.isNpc ? candidate.npcName : candidate.user?.username || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {candidate.isNpc ? candidate.npcBio : `Player · ${candidate.user?.playerRole}`}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => castVote(election.id, candidate.id)}
                                            disabled={votingFor === candidate.id}
                                            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all ${votingFor === candidate.id
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                                                }`}
                                        >
                                            {votingFor === candidate.id ? 'Voting...' : 'Vote'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Already voted indicator */}
            {elections.filter(e => e.status === 'VOTING' && e.hasVoted).map(election => (
                <div key={election.id} className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                        <div className="text-sm font-bold text-green-400">You voted in the {RANK_LABELS[election.electionType] || election.electionType} election</div>
                        <div className="text-xs text-gray-500">Results will be announced when voting closes</div>
                    </div>
                </div>
            ))}

            {/* Municipal Events Feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        📋 Municipal Events
                    </h3>
                    {events.length > 0 && (
                        <span className="text-xs text-cyan-400 font-bold">{events[0]?.municipality?.name}</span>
                    )}
                </div>

                {events.length === 0 ? (
                    <div className="p-6 text-center text-gray-600 text-sm">No events yet in your municipality</div>
                ) : (
                    <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                        {events.map(event => (
                            <div key={event.id} className="px-5 py-3 hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg mt-0.5">{EVENT_ICONS[event.eventType] || '📋'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm">{event.title}</div>
                                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{event.content}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {new Date(event.publishedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Campaigning Elections */}
            {elections.filter(e => e.status === 'CAMPAIGNING').map(election => (
                <div key={election.id} className="bg-gray-900 border border-amber-800/30 rounded-xl p-4">
                    <div className="text-sm font-bold text-amber-400 mb-1">
                        📢 Upcoming {RANK_LABELS[election.electionType] || election.electionType} Election
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                        Voting begins: {new Date(election.votingStart).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                        {election.candidates.length} candidate{election.candidates.length !== 1 ? 's' : ''} registered
                    </div>
                </div>
            ))}
        </div>
    );
}
