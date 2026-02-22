'use client';

import React, { useEffect, useState } from 'react';

interface Portfolio {
    id: string;
    assetId: string;
    quantity: number;
    averageEntryPrice: number;
    isShortPosition: boolean;
    asset: { symbol: string; name: string; basePrice: number };
}

interface User {
    id: string;
    username: string | null;
    role: string;
    deltaBalance: number;
    frozen: boolean;
    portfolios: Portfolio[];
}

type ModalType = 'ADD_USER' | 'BULK_IMPORT' | null;

const EXPORT_TABLES = [
    { key: 'all', label: 'All Data', icon: '📦' },
    { key: 'users', label: 'Users', icon: '👤' },
    { key: 'assets', label: 'Assets', icon: '📊' },
    { key: 'priceHistory', label: 'Price History', icon: '📈' },
    { key: 'portfolios', label: 'Portfolios', icon: '💼' },
    { key: 'transactions', label: 'Transactions', icon: '💸' },
    { key: 'news', label: 'News Stories', icon: '📰' },
    { key: 'loans', label: 'Loans', icon: '🏦' },
    { key: 'limitOrders', label: 'Limit Orders', icon: '⏳' },
];

const IMPORT_TABLES = EXPORT_TABLES.filter(t => t.key !== 'all');

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [editingBalance, setEditingBalance] = useState<string | null>(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [modal, setModal] = useState<ModalType>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Add user form
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Bulk import
    const [bulkCSV, setBulkCSV] = useState('');
    const [bulkResults, setBulkResults] = useState<{ username: string; status: string }[]>([]);

    // DB Import
    const [importTable, setImportTable] = useState('users');
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    // Invite codes
    const [codeCount, setCodeCount] = useState(1);
    const [generatingCodes, setGeneratingCodes] = useState(false);
    const [inviteCodes, setInviteCodes] = useState<{ code: string; used: boolean; usedById?: string | null; createdAt: string }[]>([]);
    const [showInvitePanel, setShowInvitePanel] = useState(false);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error('Failed to fetch users:', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchUsers(); }, []);

    function showFeedback(type: 'success' | 'error', message: string) {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername, password: newPassword })
            });
            if (res.ok) {
                showFeedback('success', `User "${newUsername}" created successfully`);
                setNewUsername('');
                setNewPassword('');
                setModal(null);
                fetchUsers();
            } else {
                const err = await res.json();
                showFeedback('error', err.error || 'Failed to create user');
            }
        } catch {
            showFeedback('error', 'Network error');
        }
    }

    async function handleBulkImport() {
        const lines = bulkCSV.trim().split('\n').filter(l => l.trim());
        const parsed = lines.map(line => {
            const parts = line.split(',').map(s => s.trim());
            return { username: parts[0], password: parts[1] || 'password' };
        });
        if (parsed.length === 0) { showFeedback('error', 'No valid rows found'); return; }
        try {
            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: parsed })
            });
            if (res.ok) {
                const data = await res.json();
                setBulkResults(data.results);
                showFeedback('success', data.message);
                fetchUsers();
            } else {
                const err = await res.json();
                showFeedback('error', err.error);
            }
        } catch { showFeedback('error', 'Network error'); }
    }

    async function toggleFreeze(userId: string, currentFrozen: boolean) {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frozen: !currentFrozen })
            });
            if (res.ok) { showFeedback('success', `Account ${!currentFrozen ? 'frozen' : 'unfrozen'}`); fetchUsers(); }
        } catch { showFeedback('error', 'Failed to toggle freeze'); }
    }

    async function handleUpdateBalance(userId: string) {
        const val = parseFloat(balanceInput);
        if (isNaN(val)) { showFeedback('error', 'Invalid number'); return; }
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deltaBalance: val })
            });
            if (res.ok) { showFeedback('success', 'Balance updated'); setEditingBalance(null); fetchUsers(); }
        } catch { showFeedback('error', 'Failed to update balance'); }
    }

    async function removePosition(userId: string, assetId: string) {
        try {
            const res = await fetch(`/api/admin/users/${userId}/portfolio?assetId=${assetId}`, { method: 'DELETE' });
            if (res.ok) { showFeedback('success', 'Position removed'); fetchUsers(); }
        } catch { showFeedback('error', 'Failed to remove position'); }
    }

    async function deleteUser(userId: string) {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (res.ok) { showFeedback('success', 'User deleted'); fetchUsers(); }
        } catch { showFeedback('error', 'Failed to delete user'); }
    }

    function handleExport(table: string) {
        const a = document.createElement('a');
        a.href = `/api/admin/export?table=${table}`;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showFeedback('success', `Exporting ${table}...`);
    }

    async function handleDBImport() {
        if (!importFile) { showFeedback('error', 'Select a file first'); return; }
        setImporting(true);
        try {
            const text = await importFile.text();
            const parsed = JSON.parse(text);
            const data = parsed[importTable] || parsed;
            if (!Array.isArray(data)) {
                showFeedback('error', `Could not find array data for table "${importTable}" in file.`);
                setImporting(false);
                return;
            }
            const res = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: importTable, mode: importMode, data })
            });
            const result = await res.json();
            if (res.ok) { showFeedback('success', result.message); fetchUsers(); }
            else { showFeedback('error', result.error); }
        } catch { showFeedback('error', 'Failed to parse or import file'); }
        finally { setImporting(false); }
    }

    async function fetchInviteCodes() {
        try {
            const res = await fetch('/api/admin/invites');
            if (res.ok) {
                const data = await res.json();
                setInviteCodes(data.codes);
            }
        } catch (e) { console.error(e); }
    }

    async function generateInviteCodes() {
        setGeneratingCodes(true);
        try {
            const res = await fetch('/api/admin/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: codeCount })
            });
            if (res.ok) {
                const data = await res.json();
                showFeedback('success', `Generated ${data.codes.length} invite code(s)`);
                fetchInviteCodes();
            } else {
                showFeedback('error', 'Failed to generate codes');
            }
        } catch (e) {
            showFeedback('error', 'Network error');
        } finally {
            setGeneratingCodes(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <div className="text-gray-400 text-lg animate-pulse">Loading Admin Dashboard...</div>
            </div>
        );
    }

    const students = users.filter(u => u.role !== 'ADMIN');
    const totalDelta = students.reduce((acc, u) => acc + u.deltaBalance, 0);
    const frozenCount = students.filter(u => u.frozen).length;

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-widest uppercase">Admin Control Panel</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage students, balances, and assets</p>
                </div>
                <a href="/" className="text-xs text-gray-400 hover:text-white font-bold uppercase tracking-widest border border-gray-700 px-3 py-2 rounded hover:bg-gray-800 transition-colors">
                    ← Dashboard
                </a>
            </header>

            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-bold ${feedback.type === 'success' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                    {feedback.message}
                </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Students</div>
                    <div className="text-2xl font-black text-white">{students.length}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Δ in Circulation</div>
                    <div className="text-2xl font-black text-green-400">Δ {totalDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Frozen Accounts</div>
                    <div className="text-2xl font-black text-red-400">{frozenCount}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Active Positions</div>
                    <div className="text-2xl font-black text-blue-400">{students.reduce((a, u) => a + u.portfolios.length, 0)}</div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 mb-4 flex gap-3">
                <button onClick={() => setModal('ADD_USER')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded transition-colors">
                    + Add Student
                </button>
                <button onClick={() => { setModal('BULK_IMPORT'); setBulkResults([]); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded transition-colors">
                    ⬆ Bulk Import
                </button>
                <button onClick={() => { setShowInvitePanel(!showInvitePanel); if (!showInvitePanel) fetchInviteCodes(); }} className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded transition-colors">
                    🔑 Invite Codes
                </button>
                <button onClick={fetchUsers} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded border border-gray-700 transition-colors ml-auto">
                    ↻ Refresh
                </button>
            </div>

            {/* Invite Code Panel */}
            {showInvitePanel && (
                <div className="px-6 pb-4">
                    <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-amber-400 mb-4 uppercase tracking-widest">🔑 Invite Code Generator</h3>
                        <div className="flex gap-3 items-end mb-4">
                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">How many?</label>
                                <input
                                    type="number"
                                    min={1} max={99}
                                    value={codeCount}
                                    onChange={e => setCodeCount(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono w-20 text-center"
                                />
                            </div>
                            <button
                                onClick={generateInviteCodes}
                                disabled={generatingCodes}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded transition-colors disabled:opacity-50"
                            >
                                {generatingCodes ? 'Generating...' : 'Generate Codes'}
                            </button>
                            {inviteCodes.filter(c => !c.used).length > 0 && (
                                <button
                                    onClick={() => {
                                        const unused = inviteCodes.filter(c => !c.used).map(c => c.code).join('\n');
                                        navigator.clipboard.writeText(unused);
                                        showFeedback('success', 'Unused codes copied to clipboard');
                                    }}
                                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded border border-gray-700 transition-colors"
                                >
                                    📋 Copy Unused
                                </button>
                            )}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {inviteCodes.length === 0 ? (
                                <p className="text-gray-500 text-sm">No invite codes generated yet.</p>
                            ) : (
                                inviteCodes.map(c => (
                                    <div key={c.code} className={`flex items-center justify-between px-3 py-2 rounded text-sm font-mono ${c.used ? 'bg-gray-800/30 text-gray-600' : 'bg-gray-800 text-white'}`}>
                                        <span className="tracking-[0.2em]">{c.code}</span>
                                        <span className={`text-xs uppercase font-bold ${c.used ? 'text-red-400' : 'text-green-400'}`}>
                                            {c.used ? `Used${c.usedById ? ` by ${c.usedById.slice(0, 8)}...` : ''}` : 'Available'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* User Table */}
            <div className="px-6 pb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-widest bg-gray-800/50">
                                <th className="px-4 py-3 text-left">Username</th>
                                <th className="px-4 py-3 text-left">Role</th>
                                <th className="px-4 py-3 text-right">Δ Balance</th>
                                <th className="px-4 py-3 text-center">Positions</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(user => (
                                <React.Fragment key={user.id}>
                                    <tr className={`border-t border-gray-800 hover:bg-gray-800/30 transition-colors ${user.frozen ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3 font-mono font-bold text-white">
                                            {user.username || <span className="text-gray-600 italic">no callsign</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">{user.role}</td>
                                        <td className="px-4 py-3 text-right">
                                            {editingBalance === user.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input type="number" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)}
                                                        className="w-32 bg-black border border-gray-700 rounded px-2 py-1 text-right text-sm font-mono text-white" autoFocus />
                                                    <button onClick={() => handleUpdateBalance(user.id)} className="text-green-400 hover:text-green-300 text-xs font-bold">✓</button>
                                                    <button onClick={() => setEditingBalance(null)} className="text-red-400 hover:text-red-300 text-xs font-bold">✗</button>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-green-400 cursor-pointer hover:underline"
                                                    onClick={() => { setEditingBalance(user.id); setBalanceInput(user.deltaBalance.toFixed(2)); }}>
                                                    Δ {user.deltaBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-400">{user.portfolios.length}</td>
                                        <td className="px-4 py-3 text-center">
                                            {user.frozen
                                                ? <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">FROZEN</span>
                                                : <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">ACTIVE</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)} className="text-xs text-blue-400 hover:text-white font-bold">
                                                    {expandedUser === user.id ? 'Collapse' : 'Details'}
                                                </button>
                                                <button onClick={() => toggleFreeze(user.id, user.frozen)}
                                                    className={`text-xs font-bold px-2 py-1 rounded ${user.frozen ? 'text-green-400 hover:bg-green-900/30' : 'text-yellow-400 hover:bg-yellow-900/30'}`}>
                                                    {user.frozen ? '☀ Unfreeze' : '❄ Freeze'}
                                                </button>
                                                <button onClick={() => deleteUser(user.id)} className="text-xs text-red-500 hover:text-red-300 font-bold">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedUser === user.id && (
                                        <tr className="bg-gray-800/20">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-bold">Portfolio Positions</div>
                                                {user.portfolios.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                                        {user.portfolios.map(p => (
                                                            <div key={p.id} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-3">
                                                                <div>
                                                                    <div className="font-mono font-bold text-white text-sm">{p.asset.symbol}</div>
                                                                    <div className="text-xs text-gray-500">{p.quantity.toFixed(2)} units @ Δ {p.averageEntryPrice.toFixed(2)}</div>
                                                                    {p.isShortPosition && <div className="text-xs text-red-400 font-bold">SHORT</div>}
                                                                </div>
                                                                <button onClick={() => removePosition(user.id, p.assetId)} className="text-xs text-red-500 hover:text-red-300 font-bold ml-3">Remove</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-gray-600 italic">No active positions.</p>}
                                                <div className="mt-3 text-xs text-gray-500">User ID: <span className="font-mono text-gray-400">{user.id}</span></div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {students.length === 0 && <div className="p-8 text-center text-gray-600">No students found. Add one to get started.</div>}
                </div>
            </div>

            {/* ====== DATABASE EXPORT ====== */}
            <div className="px-6 pb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-black uppercase tracking-widest text-white mb-1">Database Export</h2>
                    <p className="text-xs text-gray-500 mb-4">Download database tables as JSON files for backup or analysis.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {EXPORT_TABLES.map(t => (
                            <button key={t.key} onClick={() => handleExport(t.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] ${t.key === 'all'
                                    ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700 text-white hover:from-blue-800/50 hover:to-purple-800/50'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}>
                                <span className="text-lg">{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ====== DATABASE IMPORT ====== */}
            <div className="px-6 pb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-black uppercase tracking-widest text-white mb-1">Database Import</h2>
                    <p className="text-xs text-gray-500 mb-4">Upload a previously exported JSON file to restore or merge data.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">JSON File</label>
                            <input type="file" accept=".json" onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border file:border-gray-700 file:bg-gray-800 file:text-gray-300 file:font-bold file:text-xs file:uppercase file:tracking-widest hover:file:bg-gray-700 file:cursor-pointer file:transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Target Table</label>
                            <select value={importTable} onChange={(e) => setImportTable(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500">
                                {IMPORT_TABLES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Import Mode</label>
                            <div className="flex gap-3">
                                <button onClick={() => setImportMode('merge')}
                                    className={`flex-1 py-2 px-3 rounded border text-xs font-bold uppercase tracking-widest transition-colors ${importMode === 'merge' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    Merge
                                </button>
                                <button onClick={() => setImportMode('replace')}
                                    className={`flex-1 py-2 px-3 rounded border text-xs font-bold uppercase tracking-widest transition-colors ${importMode === 'replace' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                                    Replace
                                </button>
                            </div>
                        </div>
                    </div>
                    {importMode === 'replace' && (
                        <div className="mt-3 bg-red-900/20 border border-red-800 rounded-lg p-3 text-xs text-red-300">
                            ⚠ <strong>Replace mode</strong> will delete ALL existing rows in the target table before importing. This is irreversible.
                        </div>
                    )}
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleDBImport} disabled={!importFile || importing}
                            className={`px-6 py-2.5 rounded font-bold text-xs uppercase tracking-widest transition-colors ${!importFile || importing ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : importMode === 'replace' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                            {importing ? 'Importing...' : `Import (${importMode})`}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            {modal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        {modal === 'ADD_USER' && (
                            <>
                                <h2 className="text-xl font-black text-white mb-4 uppercase tracking-widest">Add Student</h2>
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Username</label>
                                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                                            placeholder="e.g. trader99" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Password</label>
                                        <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                                            placeholder="Password" required />
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button type="button" onClick={() => setModal(null)} className="text-gray-400 hover:text-white text-xs font-bold uppercase px-3 py-2">Cancel</button>
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-4 py-2 rounded">Create</button>
                                    </div>
                                </form>
                            </>
                        )}
                        {modal === 'BULK_IMPORT' && (
                            <>
                                <h2 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Bulk Import Students</h2>
                                <p className="text-xs text-gray-500 mb-4">Paste CSV data — Column A: username, Column B: password. One per line.</p>
                                <textarea value={bulkCSV} onChange={e => setBulkCSV(e.target.value)}
                                    className="w-full h-40 bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500 resize-none"
                                    placeholder={`student1,pass123\nstudent2,pass456\nstudent3,pass789`} />
                                {bulkResults.length > 0 && (
                                    <div className="mt-4 max-h-32 overflow-y-auto bg-gray-800 rounded p-3 border border-gray-700">
                                        {bulkResults.map((r, i) => (
                                            <div key={i} className={`text-xs font-mono ${r.status === 'CREATED' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {r.username}: {r.status}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-3 justify-end mt-4">
                                    <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white text-xs font-bold uppercase px-3 py-2">Close</button>
                                    <button onClick={handleBulkImport} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase px-4 py-2 rounded">Import</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
