'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to login');
            }
        } catch (err) {
            setError('An error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">

            <div className="w-48 h-48 mb-6">
                <img src="/logo.png" alt="OxNet Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-black text-white text-center mb-2 tracking-widest uppercase">Operator Login</h1>
                <p className="text-gray-400 text-center mb-8 text-sm uppercase tracking-wider">Access the Exchange</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">
                            Callsign / Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            placeholder="e.g. ez18"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">
                            Passphrase
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-colors ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        {loading ? 'Authenticating...' : 'Enter System'}
                    </button>
                </form>
            </div>

            <div className="mt-12 text-center text-xs text-gray-600 uppercase tracking-widest">
                OxNet Arbitrage Engine © 2026
            </div>
        </main>
    );
}
