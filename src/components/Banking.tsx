'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Banking({ user }: { user: any }) {
    const router = useRouter();

    // Transfer State
    const [recipient, setRecipient] = useState('');
    const [transferAmount, setTransferAmount] = useState<number | ''>('');
    const [transferLoading, setTransferLoading] = useState(false);

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

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950 font-sans">
            <h1 className="text-3xl font-black text-white mb-8 border-b border-gray-800 pb-4 uppercase tracking-widest">FennPay</h1>

            <div className="max-w-xl mx-auto mb-8">

                {/* FennPay Transfers */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        FennPay
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">Instantly transfer Delta to any active Operator.</p>

                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Recipient Callsign</label>
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
            </div>
        </div>
    );
}
