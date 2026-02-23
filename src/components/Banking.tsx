'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Banking({ user, allUsers }: { user: any, allUsers: any[] }) {
    const router = useRouter();

    // Transfer State
    const [recipient, setRecipient] = useState('');
    const [transferAmount, setTransferAmount] = useState<number | ''>('');
    const [transferLoading, setTransferLoading] = useState(false);

    // Lending State
    const [lendingLimit, setLendingLimit] = useState<number>(user.lendingLimit || 0);
    const [lendingRate, setLendingRate] = useState<number>(user.lendingRate || 0);
    const [configLoading, setConfigLoading] = useState(false);

    const availableDelta = user.deltaBalance - (user.marginLoan || 0);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient || !transferAmount || typeof transferAmount !== 'number' || transferAmount <= 0) return;
        setTransferLoading(true);

        try {
            const res = await fetch('/api/banking/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientUsername: recipient, amount: transferAmount })
            });
            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                setRecipient('');
                setTransferAmount('');
                router.refresh();
            } else {
                alert(`Transfer Failed: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleUpdateLending = async () => {
        setConfigLoading(true);
        try {
            const res = await fetch('/api/banking/lend-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lendingLimit, lendingRate })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Lending parameters saved.');
                router.refresh();
            } else {
                alert(`Save Failed: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setConfigLoading(false);
        }
    };

    const handleBorrow = async (lenderId: string, amount: number) => {
        if (!confirm(`Are you sure you want to borrow ${amount} Delta from this user?`)) return;

        try {
            const res = await fetch('/api/banking/borrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lenderId, borrowAmount: amount })
            });
            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                router.refresh();
            } else {
                alert(`Borrow Failed: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950 font-sans">
            <h1 className="text-3xl font-black text-white mb-8 border-b border-gray-800 pb-4 uppercase tracking-widest">Global Banking Services</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Peer to Peer Transfers */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        Peer-to-Peer Transfer
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">Instantly transfer Delta to any active Operator.</p>

                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Recipient Identity</label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                                placeholder="..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Transfer Amount (Δ)</label>
                            <input
                                type="number"
                                value={transferAmount}
                                onChange={e => setTransferAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full bg-black border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                                placeholder="0.00"
                                max={availableDelta}
                                required
                            />
                            <div className="text-xs text-green-500 mt-1 font-mono text-right">Available: {availableDelta.toFixed(2)}</div>
                        </div>
                        <button
                            type="submit"
                            disabled={transferLoading}
                            className={`w-full py-3 rounded font-bold uppercase tracking-widest transition-colors ${transferLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {transferLoading ? 'Processing...' : 'Execute Transfer'}
                        </button>
                    </form>
                </div>

                {/* Micro-Lending Configuration */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-purple-400 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Operator Microlending
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">Set your parameters to lend your available liquidity to others.</p>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Total Lending Limit</span>
                                <span className="font-mono text-blue-300">Δ {lendingLimit.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max={availableDelta} step="100"
                                value={lendingLimit}
                                onChange={e => setLendingLimit(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1">
                                <span>0</span>
                                <span>{availableDelta.toFixed(0)}</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Fixed Interest Rate</span>
                                <span className="font-mono text-purple-300">{(lendingRate * 100).toFixed(1)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="0.5" step="0.01"
                                value={lendingRate}
                                onChange={e => setLendingRate(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1">
                                <span>0%</span>
                                <span>50%</span>
                            </div>
                        </div>

                        <button
                            onClick={handleUpdateLending}
                            disabled={configLoading}
                            className={`w-full py-3 rounded font-bold uppercase tracking-widest transition-colors ${configLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white border border-purple-500'}`}
                        >
                            {configLoading ? 'Committing...' : 'Commit Settings to Oracle'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Lending Directory */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-widest border-b border-gray-800 pb-2">Global Liquidity Directory</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="py-3 px-4">Lender Identity</th>
                                <th className="py-3 px-4">Available To Borrow</th>
                                <th className="py-3 px-4">Interest Rate</th>
                                <th className="py-3 px-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.filter(u => u.lendingLimit > 0 && u.id !== user.id).length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500 font-serif italic border-b border-gray-800/50">
                                        No Operators are currently offering liquidity.
                                    </td>
                                </tr>
                            ) : (
                                allUsers.filter(u => u.lendingLimit > 0 && u.id !== user.id).map(lender => {
                                    // Calculate actual available (Limit - Currently Lent)
                                    const activeLoansLent: number = lender.loansGiven?.reduce((acc: number, loan: any) => acc + loan.principal, 0) || 0;
                                    const available = Math.max(0, lender.lendingLimit - activeLoansLent);
                                    if (available <= 0) return null;

                                    const rate = (lender.lendingRate * 100).toFixed(1);

                                    return (
                                        <tr key={lender.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                            <td className="py-3 px-4 font-mono text-white flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-[10px] font-bold">
                                                    {lender.username?.substring(0, 2).toUpperCase() || lender.id.substring(0, 2)}
                                                </div>
                                                {lender.username || lender.id}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-green-400">Δ {available.toFixed(2)}</td>
                                            <td className="py-3 px-4 font-mono text-purple-400">{rate}%</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => {
                                                        const amount = prompt(`How much would you like to borrow from ${lender.username}? (Max: ${available})`);
                                                        if (amount) handleBorrow(lender.id, parseFloat(amount));
                                                    }}
                                                    className="bg-gray-800 hover:bg-white hover:text-black border border-gray-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors uppercase"
                                                >
                                                    Tap Liquidity
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
