'use client';
import { useState, useEffect, useCallback } from 'react';

interface PolicyProposal { id: string; title: string; description: string; policyType: string; targetSector?: string; effectValue: number; status: string; votesFor: number; votesAgainst: number; endsAt: string; }

export default function PoliticianPanel({ userId }: { userId: string }) {
    const [proposals, setProposals] = useState<PolicyProposal[]>([]);
    const [donations, setDonations] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'proposals' | 'propose' | 'donations'>('proposals');
    const [msg, setMsg] = useState('');
    const [form, setForm] = useState({ title: '', description: '', policyType: 'TARIFF', targetSector: '', effectValue: '0.05', daysToVote: '3' });

    const POLICY_TYPES = ['TARIFF', 'SUBSIDY', 'TAX_HOLIDAY', 'SECTOR_BAN'];

    const load = useCallback(async () => {
        setLoading(true);
        const [polRes, donRes] = await Promise.all([fetch(`/api/policy?proposerId=${userId}`), fetch(`/api/policy/donations?userId=${userId}`)]);
        const [polData, donData] = await Promise.all([polRes.json(), donRes.json()]);
        setProposals(Array.isArray(polData) ? polData : []);
        if (donData && !donData.error) setDonations(donData);
        setLoading(false);
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const handlePropose = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/policy/propose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ...form, effectValue: Number(form.effectValue), daysToVote: Number(form.daysToVote) }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Policy proposal submitted for vote!' : `❌ ${d.error}`);
        if (res.ok) { setForm({ title: '', description: '', policyType: 'TARIFF', targetSector: '', effectValue: '0.05', daysToVote: '3' }); setTab('proposals'); load(); }
    };

    const statusColor = (s: string) => s === 'VOTING' ? '#f59e0b' : s === 'PASSED' ? '#22c55e' : s === 'ENACTED' ? '#6366f1' : '#ef4444';
    const st = { panel: { background: '#0f172a', borderRadius: 12, padding: 24, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }, card: { background: '#1e293b', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }, tab: (active: boolean) => ({ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: active ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent', color: active ? 'white' : '#94a3b8' }) };

    return (
        <div style={st.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🗳️</div>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Politician's Office</h2><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Propose economy-wide policies. Earn mandate through donations.</p></div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', borderRadius: 8, padding: 4 }}>
                {(['proposals', 'propose', 'donations'] as const).map(t => <button key={t} onClick={() => setTab(t)} style={st.tab(tab === t)}>{t === 'proposals' ? '📜 My Proposals' : t === 'propose' ? '➕ Propose Policy' : '💰 Donations'}</button>)}
            </div>
            {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</div>}
            {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : tab === 'proposals' ? (
                proposals.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 40, border: '2px dashed #1e293b', borderRadius: 8 }}>No proposals yet. Use the Propose tab to submit your first policy.</div> : proposals.map(p => (
                    <div key={p.id} style={st.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div><div style={{ fontWeight: 700 }}>{p.title}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{p.policyType}{p.targetSector ? ` · ${p.targetSector}` : ''} · Effect: {(p.effectValue * 100).toFixed(1)}%</div></div>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor(p.status)}20`, color: statusColor(p.status) }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{p.description}</div>
                        {p.status === 'VOTING' && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1, background: '#0f172a', borderRadius: 6, overflow: 'hidden', height: 8 }}>
                                    <div style={{ height: '100%', background: '#22c55e', width: `${p.votesFor + p.votesAgainst > 0 ? (p.votesFor / (p.votesFor + p.votesAgainst)) * 100 : 0}%` }} />
                                </div>
                                <span style={{ fontSize: 12, color: '#22c55e' }}>{p.votesFor} for</span>
                                <span style={{ fontSize: 12, color: '#ef4444' }}>{p.votesAgainst} against</span>
                                <span style={{ fontSize: 11, color: '#64748b' }}>ends {new Date(p.endsAt).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                ))
            ) : tab === 'propose' ? (
                <form onSubmit={handlePropose}>
                    {[{ label: 'Policy Title', key: 'title', type: 'text', ph: 'e.g. "Tech Sector Tariff Relief"' }, { label: 'Description', key: 'description', type: 'text', ph: 'What this policy does and why...' }].map(f => (
                        <div key={f.key} style={{ marginBottom: 10 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                            <input type={f.type} placeholder={f.ph} required value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' as any }} />
                        </div>
                    ))}
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Policy Type</label>
                        <select required value={form.policyType} onChange={e => setForm(p => ({ ...p, policyType: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }}>
                            {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {[{ label: 'Target Sector (optional)', key: 'targetSector', ph: 'Leave blank for economy-wide' }, { label: 'Effect Value (e.g. 0.05 = 5%)', key: 'effectValue', ph: '0.05' }, { label: 'Days for Voting', key: 'daysToVote', ph: '3' }].map(f => (
                        <div key={f.key} style={{ marginBottom: 10 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                            <input type="text" placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' as any }} />
                        </div>
                    ))}
                    <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', fontWeight: 700, marginTop: 4 }}>Submit for Vote</button>
                </form>
            ) : (
                <div style={st.card}>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Total Campaign Donations Received</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', fontFamily: 'monospace' }}>Δ{donations.total.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{donations.count} donors</div>
                </div>
            )}
        </div>
    );
}
