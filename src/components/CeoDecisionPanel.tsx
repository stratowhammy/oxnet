'use client';

import React, { useEffect, useState } from 'react';

interface Scenario {
    id: string;
    question: string;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    chosenOption: string | null;
    answeredAt: string | null;
    newsPublished: boolean;
}

interface Company {
    symbol: string;
    name: string;
    sector: string;
    niche: string;
}

export default function CeoDecisionPanel() {
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        fetchScenario();
    }, []);

    async function fetchScenario() {
        setLoading(true);
        try {
            const res = await fetch('/api/ceo/scenario');
            if (res.ok) {
                const data = await res.json();
                setScenario(data.scenario);
                setCompany(data.company);
            }
        } catch (e) {
            console.error('Failed to fetch CEO scenario:', e);
        } finally {
            setLoading(false);
        }
    }

    async function submitChoice(choice: 'A' | 'B' | 'C') {
        if (!scenario) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/ceo/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioId: scenario.id, choice })
            });
            if (res.ok) {
                const data = await res.json();
                setScenario(data.scenario);
                setFeedback('Your decision has been recorded. A news story will be published shortly.');
            }
        } catch {
            setFeedback('Failed to submit decision');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-yellow-800/50 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-yellow-900/30 rounded w-48 mb-3"></div>
                <div className="h-3 bg-yellow-900/20 rounded w-full mb-2"></div>
                <div className="h-3 bg-yellow-900/20 rounded w-3/4"></div>
            </div>
        );
    }

    if (!scenario || !company) return null;

    const choiceLabels: Record<string, string> = {
        A: scenario.choiceA,
        B: scenario.choiceB,
        C: scenario.choiceC,
    };

    return (
        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-yellow-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🏢</span>
                <div>
                    <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest">CEO Decision — {company.symbol}</h3>
                    <p className="text-xs text-gray-500">{company.name} • {company.sector}</p>
                </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-200 leading-relaxed">{scenario.question}</p>
            </div>

            {scenario.chosenOption ? (
                <div className="space-y-3">
                    <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 text-sm">
                        <div className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1">Your Decision: Option {scenario.chosenOption}</div>
                        <p className="text-gray-300">{choiceLabels[scenario.chosenOption]}</p>
                    </div>
                    {feedback && <p className="text-xs text-yellow-400 italic">{feedback}</p>}
                    {scenario.newsPublished ? (
                        <p className="text-xs text-gray-500 italic">📰 A news story has been published about this decision.</p>
                    ) : (
                        <p className="text-xs text-gray-500 italic animate-pulse">⏳ A news story will be published shortly...</p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {(['A', 'B', 'C'] as const).map(choice => (
                        <button
                            key={choice}
                            onClick={() => submitChoice(choice)}
                            disabled={submitting}
                            className="w-full text-left bg-gray-800/50 hover:bg-yellow-900/30 border border-gray-700 hover:border-yellow-700 rounded-lg p-3 transition-all group disabled:opacity-50"
                        >
                            <div className="flex items-start gap-3">
                                <span className="bg-yellow-900/50 text-yellow-400 text-xs font-black w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-yellow-800/50">
                                    {choice}
                                </span>
                                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                    {choiceLabels[choice]}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
