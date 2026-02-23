'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ALL_ROLES = [
    { key: 'CEO', label: 'CEO', icon: '🏢', desc: 'Run a corporation. Manage production, set prices, issue goods.' },
    { key: 'FACTORY_OWNER', label: 'Factory Owner', icon: '🏭', desc: 'Operate a physical facility. Produce goods, manage workers.' },
    { key: 'SMALL_BUSINESS', label: 'Small Business Owner', icon: '🏪', desc: 'Buy wholesale, retail goods, bid on government contracts.' },
    { key: 'UNION_LEADER', label: 'Union Leader', icon: '🔩', desc: 'Represent workers. Negotiate wages, call strikes.' },
    { key: 'MAYOR', label: 'City Mayor', icon: '🏛️', desc: 'Govern a municipality. Set taxes, issue procurement contracts.' },
    { key: 'POLITICIAN', label: 'Politician', icon: '🗳️', desc: 'Propose economy-wide policies. Earn campaign donations.' },
    { key: 'TRADER', label: 'Retail Trader', icon: '📈', desc: 'Trade stocks, buy goods, participate in the open market.' },
    { key: 'HFM', label: 'Hedge Fund Manager', icon: '💰', desc: 'Finance production loans, speculate on supply chains.' },
];

type Mode = 'LOGIN' | 'CREATE_CHARACTER' | 'CHOOSE_ROLE' | 'IDENTITY_REVEAL';

interface Municipality {
    id: string;
    name: string;
    description: string | null;
    _count: { residents: number };
}

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('LOGIN');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // Identity reveal state
    const [revealedName, setRevealedName] = useState('');
    const [revealedBackstory, setRevealedBackstory] = useState('');
    const [revealedCity, setRevealedCity] = useState('');
    const router = useRouter();

    // Fetch municipalities when entering CHOOSE_ROLE
    useEffect(() => {
        if (mode === 'CHOOSE_ROLE' && municipalities.length === 0) {
            fetch('/api/municipalities').then(r => r.json()).then(data => {
                if (Array.isArray(data)) setMunicipalities(data);
            }).catch(() => { });
        }
    }, [mode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) { router.push('/'); router.refresh(); }
            else { const data = await res.json(); setError(data.error || 'Login failed'); }
        } catch { setError('Network error during login.'); }
        finally { setLoading(false); }
    };

    // Step 1: Validate invite code and preview allowed roles
    const handleValidateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/invite/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inviteCode.toUpperCase().trim() })
            });
            const data = await res.json();
            if (res.ok) {
                setAllowedRoles(data.allowedRoles);
                setMode('CHOOSE_ROLE');
            } else {
                setError(data.error || 'Invalid code');
            }
        } catch { setError('Network error.'); }
        finally { setLoading(false); }
    };

    // Step 2: Register — AI generates name, user only sets password + municipality
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: inviteCode.toUpperCase().trim(),
                    playerRole: selectedRole,
                    municipalityId: selectedMunicipality,
                    password: newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                // Show identity reveal
                setRevealedName(data.characterName || 'Unknown Agent');
                setRevealedBackstory(data.backstory || '');
                setRevealedCity(data.municipality || '');
                setMode('IDENTITY_REVEAL');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch { setError('Network error.'); }
        finally { setLoading(false); }
    };

    const btnBase = 'w-full py-4 rounded font-bold uppercase tracking-widest transition-all';

    return (
        <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="w-32 h-32 mb-6">
                <img src="/logo.png" alt="OxNet Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">

                {/* ─── LOGIN ─── */}
                {mode === 'LOGIN' && (
                    <>
                        <h1 className="text-3xl font-black text-white text-center mb-1 tracking-widest uppercase">OxNet</h1>
                        <p className="text-gray-500 text-center mb-8 text-xs uppercase tracking-wider">Arbitrage Engine · Oxford 2026</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm text-center">{error}</div>}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Identity</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                                    className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                                    placeholder="Your handle" />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Passphrase</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                    className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                                    placeholder="••••••••" />
                            </div>
                            <button type="submit" disabled={loading}
                                className={`${btnBase} ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                {loading ? 'Authenticating...' : 'Enter System'}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <button onClick={() => { setMode('CREATE_CHARACTER'); setError(''); }}
                                className="w-full py-4 rounded font-bold uppercase tracking-widest transition-all border-2 border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white">
                                ✦ Create New Character
                            </button>
                        </div>
                    </>
                )}

                {/* ─── CREATE CHARACTER: enter code ─── */}
                {mode === 'CREATE_CHARACTER' && (
                    <>
                        <h1 className="text-2xl font-black text-white text-center mb-1 tracking-widest uppercase">New Character</h1>
                        <p className="text-gray-400 text-center mb-8 text-xs uppercase tracking-wider">Enter your 8-digit invitation code</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm text-center">{error}</div>}

                        <form onSubmit={handleValidateCode} className="space-y-6">
                            <div>
                                <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Invitation Code</label>
                                <input type="text" value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                                    className="w-full bg-black border border-purple-700/50 rounded px-4 py-4 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-center text-2xl tracking-[0.5em] uppercase"
                                    placeholder="XXXXXXXX" maxLength={8} required />
                                <p className="text-xs text-gray-600 mt-2 text-center">Provided by your administrator</p>
                            </div>
                            <button type="submit" disabled={loading || inviteCode.length !== 8}
                                className={`${btnBase} ${loading || inviteCode.length !== 8 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30'}`}>
                                {loading ? 'Validating...' : 'Validate Code →'}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                            <button onClick={() => { setMode('LOGIN'); setError(''); }} className="text-sm text-gray-500 hover:text-white font-bold uppercase tracking-widest transition-colors">
                                ← Back to Login
                            </button>
                        </div>
                    </>
                )}

                {/* ─── CHOOSE ROLE + MUNICIPALITY + PASSWORD ─── */}
                {mode === 'CHOOSE_ROLE' && (
                    <>
                        <h1 className="text-2xl font-black text-white text-center mb-1 tracking-widest uppercase">Choose Your Role</h1>
                        <p className="text-gray-400 text-center mb-6 text-xs uppercase tracking-wider">Your invite unlocks the following paths</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">{error}</div>}

                        {/* Role cards */}
                        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
                            {ALL_ROLES.filter(r => allowedRoles.includes(r.key)).map(role => (
                                <button key={role.key} type="button" onClick={() => setSelectedRole(role.key)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRole === role.key ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{role.icon}</span>
                                        <div>
                                            <div className="font-bold text-white text-sm">{role.label}</div>
                                            <div className="text-xs text-gray-400">{role.desc}</div>
                                        </div>
                                        {selectedRole === role.key && <span className="ml-auto text-purple-400 text-lg">✓</span>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Municipality + Password (shown after role is selected) */}
                        {selectedRole && (
                            <form onSubmit={handleRegister} className="space-y-4">
                                {/* Municipality selection */}
                                <div>
                                    <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Choose Municipality</label>

                                    {selectedRole === 'MAYOR' ? (
                                        <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30 text-purple-300 text-xs italic">
                                            Administrative seat will be automatically assigned based on city availability.
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {municipalities.length === 0 ? (
                                                <div className="text-xs text-gray-600 animate-pulse py-2">Loading available municipalities...</div>
                                            ) : (
                                                municipalities.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => setSelectedMunicipality(m.id)}
                                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${selectedMunicipality === m.id
                                                            ? 'border-cyan-500 bg-cyan-500/10'
                                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-bold text-white text-sm">{m.name}</div>
                                                                <div className="text-xs text-gray-400 line-clamp-1">{m.description}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-600">{m._count.residents} residents</span>
                                                                {selectedMunicipality === m.id && <span className="text-cyan-400">✓</span>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Password only */}
                                <div>
                                    <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">Set Passphrase</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                                        className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                        placeholder="Min. 6 characters" />
                                </div>

                                <p className="text-xs text-gray-500 text-center italic">Your identity will be assigned by the system</p>

                                <button type="submit" disabled={loading || (selectedRole !== 'MAYOR' && !selectedMunicipality)}
                                    className={`${btnBase} ${loading || (selectedRole !== 'MAYOR' && !selectedMunicipality) ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30'}`}>
                                    {loading ? '✦ Forging Identity...' : `Create ${ALL_ROLES.find(r => r.key === selectedRole)?.label ?? 'Character'} →`}
                                </button>
                            </form>
                        )}

                        <div className="mt-4 text-center">
                            <button onClick={() => { setMode('CREATE_CHARACTER'); setError(''); setSelectedRole(''); }} className="text-sm text-gray-500 hover:text-white font-bold uppercase tracking-widest transition-colors">
                                ← Back
                            </button>
                        </div>
                    </>
                )}

                {/* ─── IDENTITY REVEAL ─── */}
                {mode === 'IDENTITY_REVEAL' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-3">✦</div>
                            <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">Identity Assigned</h1>
                            <p className="text-gray-500 text-xs uppercase tracking-wider">Welcome to OxNet</p>
                        </div>

                        <div className="bg-black/50 border border-purple-700/30 rounded-xl p-5 mb-6">
                            <div className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-2">Your Identity</div>
                            <div className="text-2xl font-black text-white mb-4">{revealedName}</div>

                            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Backstory</div>
                            <div className="text-sm text-gray-300 leading-relaxed mb-4">{revealedBackstory}</div>

                            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Municipality</div>
                            <div className="text-sm text-cyan-400 font-bold">{revealedCity}</div>
                        </div>

                        <button
                            onClick={() => { router.push('/'); router.refresh(); }}
                            className={`${btnBase} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30`}>
                            Enter the Simulation →
                        </button>
                    </>
                )}
            </div>

            <div className="mt-10 text-center text-xs text-gray-700 uppercase tracking-widest">
                OxNet Arbitrage Engine © 2026
            </div>
        </main>
    );
}
