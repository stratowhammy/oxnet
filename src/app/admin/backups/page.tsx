'use client';

import React, { useEffect, useState } from 'react';

type BackupMetadata = {
    filename: string;
    sizeBytes: number;
    createdAt: string;
};

export default function AdminBackupsPage() {
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/backups');
            const data = await res.json();
            if (data.backups) {
                setBackups(data.backups);
            }
        } catch (e) {
            console.error("Failed to load backups", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (filename: string) => {
        // Redundant extremely aggressive confirmation protection
        const conf1 = confirm(`WARNING: You are about to DESTROY the active live database and replace it with ${filename}.`);
        if (!conf1) return;

        const conf2 = confirm(`Are you absolutely sure? Unsaved trades will be permanently lost.`);
        if (!conf2) return;

        setRestoring(true);
        try {
            const res = await fetch('/api/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`RESTORE COMPLETE: ${data.message}`);
                window.location.reload(); // Hard reload on massive state desync
            } else {
                alert(`RESTORE FAILED: ${data.error}`);
            }
        } catch (e) {
            alert('Restore network error.');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
            <header className="mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-bold text-white mb-2">OxNet Systems / Database Snapshots</h1>
                <p className="text-gray-400">Manage automated chronological copies of the SQLite application container.</p>
            </header>

            <div className="max-w-6xl mx-auto">
                <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                        <h2 className="text-xl font-bold text-white">Available Restore Points</h2>
                        <button
                            onClick={fetchBackups}
                            className="text-sm bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">Loading filesystem metadata...</div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 italic">No automated database snapshots found in /public/backups.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase">
                                        <th className="pb-3 font-semibold">Snapshot Identifier</th>
                                        <th className="pb-3 font-semibold">Date Captured</th>
                                        <th className="pb-3 font-semibold text-right">Filesize</th>
                                        <th className="pb-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {backups.map(b => (
                                        <tr key={b.filename} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="py-4 font-mono text-blue-400">{b.filename}</td>
                                            <td className="py-4 text-gray-300">
                                                {new Date(b.createdAt).toLocaleString(undefined, {
                                                    dateStyle: 'medium', timeStyle: 'short'
                                                })}
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-400">
                                                {(b.sizeBytes / 1024 / 1024).toFixed(2)} MB
                                            </td>
                                            <td className="py-4 text-right space-x-3">
                                                <a
                                                    href={`/backups/${b.filename}`}
                                                    download={b.filename}
                                                    className="inline-block text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-800/50 font-bold py-1.5 px-4 rounded transition-colors cursor-pointer"
                                                >
                                                    Download
                                                </a>
                                                <button
                                                    onClick={() => handleRestore(b.filename)}
                                                    disabled={restoring}
                                                    className={`inline-block text-sm font-bold py-1.5 px-4 rounded transition-colors ${restoring ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-800/50'}`}
                                                >
                                                    Restore Server
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay if actively restoring to prevent input */}
            {restoring && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 p-8 rounded-xl border border-red-900 shadow-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
                        <h2 className="text-xl font-bold text-red-500 mb-2">HOT REPLACING ACTIVE DATABASE</h2>
                        <p className="text-gray-400">Do not close this window...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
