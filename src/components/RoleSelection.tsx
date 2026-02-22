'use client';

import React, { useState } from 'react';

interface Asset {
    id: string;
    symbol: string;
    name: string;
    sector: string;
    niche: string;
}

interface RoleSelectionProps {
    userId: string;
    username: string | null;
    availableCompanies: Asset[];
}

type Step = 'ROLE' | 'PASSWORD';

export default function RoleSelection({ userId, username, availableCompanies }: RoleSelectionProps) {
    const [step, setStep] = useState<Step>('ROLE');
    const [selectedRole, setSelectedRole] = useState<'CEO' | 'HEDGE_FUND' | 'RETAIL' | null>(null);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [generatedHandle, setGeneratedHandle] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Pick role → get AI-generated handle
    async function handleRoleSubmit() {
        if (!selectedRole) return;
        if (selectedRole === 'CEO' && !selectedCompany) {
            setError('Select a company to manage');
            return;
        }
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/user/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'PICK_ROLE',
                    role: selectedRole,
                    assetId: selectedRole === 'CEO' ? selectedCompany : undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                setGeneratedHandle(data.handle);
                setStep('PASSWORD');
            } else {
                setError(data.error || 'Failed to select role');
            }
        } catch {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    }

    // Step 2: Set password → finalize
    async function handlePasswordSubmit() {
        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/user/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'FINALIZE',
                    role: selectedRole,
                    assetId: selectedRole === 'CEO' ? selectedCompany : undefined,
                    handle: generatedHandle,
                    password: password,
                })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to finalize');
            }
        } catch {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    }

    const roles = [
        {
            key: 'CEO' as const,
            title: 'Chief Executive Officer',
            subtitle: 'Lead a listed company',
            icon: '🏢',
            color: 'from-amber-900/40 to-yellow-900/40',
            border: 'border-yellow-700',
            highlight: 'text-yellow-400',
            description: 'Take the helm of a listed company. Face daily business decisions that directly impact your company\'s stock price and make headlines in The Market Master Journal.',
            details: ['Manage one listed company', 'Daily AI-generated business scenarios', 'Your decisions become news stories', 'Starting balance: Δ 100,000'],
        },
        {
            key: 'HEDGE_FUND' as const,
            title: 'Hedge Fund Manager',
            subtitle: 'Manage a Δ10M fund',
            icon: '📊',
            color: 'from-blue-900/40 to-cyan-900/40',
            border: 'border-blue-700',
            highlight: 'text-blue-400',
            description: 'Manage a Δ10,000,000 institutional fund. Earn 10% of every profitable trade as a personal bonus. But beware — if your fund drops below Δ7,500,000, you lose your position.',
            details: ['Fund capital: Δ 10,000,000', 'Earn 10% of positive trade PNL', 'Demoted to Retail if fund < Δ 7.5M', 'Personal balance: Δ 100,000'],
        },
        {
            key: 'RETAIL' as const,
            title: 'Retail Investor',
            subtitle: 'Trade your way to the top',
            icon: '💰',
            color: 'from-green-900/40 to-emerald-900/40',
            border: 'border-green-700',
            highlight: 'text-green-400',
            description: 'Start with Δ100,000 and compete on the open market. No strings attached — pure trading skill determines your success on the leaderboard.',
            details: ['Starting balance: Δ 100,000', 'Full access to all markets', 'No performance requirements', 'Compete on the leaderboard'],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
            {/* Logo + Welcome */}
            <div className="text-center mb-10">
                <div className="w-24 h-24 mx-auto mb-4">
                    <img src="/logo.png" alt="OxNet" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
                <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-2">
                    Welcome to the Exchange
                </h1>
                <p className="text-gray-400 text-sm uppercase tracking-wider">Choose your path</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm text-center max-w-2xl w-full">
                    {error}
                </div>
            )}

            {step === 'ROLE' && (
                <>
                    {/* Role Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-8">
                        {roles.map(r => {
                            const isSelected = selectedRole === r.key;
                            const isDisabled = r.key === 'CEO' && availableCompanies.length === 0;

                            return (
                                <button
                                    key={r.key}
                                    onClick={() => !isDisabled && setSelectedRole(r.key)}
                                    disabled={isDisabled}
                                    className={`relative text-left p-6 rounded-xl border-2 transition-all duration-300 ${isSelected
                                            ? `bg-gradient-to-br ${r.color} ${r.border} scale-[1.02] shadow-xl`
                                            : isDisabled
                                                ? 'bg-gray-900/50 border-gray-800 opacity-40 cursor-not-allowed'
                                                : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/50'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                            <span className="text-white text-sm">✓</span>
                                        </div>
                                    )}
                                    <div className="text-4xl mb-3">{r.icon}</div>
                                    <h2 className={`text-xl font-black uppercase tracking-widest mb-1 ${isSelected ? r.highlight : 'text-white'}`}>
                                        {r.title}
                                    </h2>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">{r.subtitle}</p>
                                    <p className="text-sm text-gray-400 leading-relaxed mb-4">{r.description}</p>
                                    <ul className="space-y-1.5">
                                        {r.details.map((d, i) => (
                                            <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? r.highlight.replace('text-', 'bg-') : 'bg-gray-600'}`}></span>
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                    {isDisabled && (
                                        <div className="mt-3 text-xs text-red-400 font-bold uppercase">All companies taken</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* CEO Company Selection */}
                    {selectedRole === 'CEO' && availableCompanies.length > 0 && (
                        <div className="max-w-md w-full mb-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">Select Your Company</label>
                            <select
                                value={selectedCompany}
                                onChange={e => setSelectedCompany(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                            >
                                <option value="">-- Choose a company --</option>
                                {availableCompanies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.symbol} — {c.name} ({c.sector})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleRoleSubmit}
                        disabled={!selectedRole || submitting}
                        className={`px-8 py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all ${!selectedRole || submitting
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                            }`}
                    >
                        {submitting ? 'Generating your identity...' : 'Continue'}
                    </button>
                </>
            )}

            {step === 'PASSWORD' && (
                <div className="max-w-md w-full">
                    {/* Generated Handle Display */}
                    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-700/50 rounded-xl p-8 mb-6 text-center">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Your Assigned Handle</div>
                        <div className="text-4xl font-black text-white tracking-wide mb-2">{generatedHandle}</div>
                        <p className="text-xs text-gray-500">This is your permanent login name. Memorize it.</p>
                    </div>

                    {/* Password Setup */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Set Your Passphrase</h3>
                        <p className="text-xs text-gray-500 mb-4">This can only be reset by an administrator.</p>

                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500"
                                placeholder="Minimum 4 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500"
                                placeholder="Re-enter password"
                            />
                        </div>

                        <button
                            onClick={handlePasswordSubmit}
                            disabled={submitting || password.length < 4}
                            className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all ${submitting || password.length < 4
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
                                }`}
                        >
                            {submitting ? 'Finalizing...' : 'Enter the Exchange'}
                        </button>
                    </div>

                    <button
                        onClick={() => { setStep('ROLE'); setError(''); }}
                        className="mt-4 text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold w-full text-center"
                    >
                        ← Go Back
                    </button>
                </div>
            )}
        </div>
    );
}
