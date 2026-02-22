'use client';
import { useState, useEffect, useCallback } from 'react';

interface MunicipalContract { id: string; status: string; quantityRequired: number; budgetDelta: number; deadline: string; good: { name: string; unit: string }; bids: { id: string; pricePerUnit: number; bidder: { username: string } }[]; }
interface Municipality { id: string; name: string; goodsTaxRate: number; deltaReserve: number; contracts: MunicipalContract[]; }

export default function MayorPanel({ userId }: { userId: string }) {
    const [city, setCity] = useState<Municipality | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'overview' | 'contracts' | 'settings'>('overview');
    const [msg, setMsg] = useState('');
    const [allGoods, setAllGoods] = useState<any[]>([]);
    const [contractForm, setContractForm] = useState({ goodId: '', quantityRequired: '', budgetDelta: '', daysUntilDeadline: '7' });
    const [taxRate, setTaxRate] = useState(2);

    const load = useCallback(async () => {
        setLoading(true);
        const [cityRes, goodsRes] = await Promise.all([fetch(`/api/mayor?userId=${userId}`), fetch('/api/goods')]);
        const [cityData, goodsData] = await Promise.all([cityRes.json(), goodsRes.json()]);
        if (cityData && !cityData.error) { setCity(cityData); setTaxRate(Math.round(cityData.goodsTaxRate * 100)); }
        setAllGoods(Array.isArray(goodsData) ? goodsData : []);
        setLoading(false);
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const handleIssueContract = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/mayor/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ...contractForm, quantityRequired: Number(contractForm.quantityRequired), budgetDelta: Number(contractForm.budgetDelta), daysUntilDeadline: Number(contractForm.daysUntilDeadline) }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Contract issued.' : `❌ ${d.error}`);
        if (res.ok) { setContractForm({ goodId: '', quantityRequired: '', budgetDelta: '', daysUntilDeadline: '7' }); load(); }
    };

    const handleSetTax = async () => {
        const res = await fetch('/api/mayor/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, goodsTaxRate: taxRate / 100 }) });
        const d = await res.json();
        setMsg(res.ok ? `✅ Tax rate set to ${taxRate}%.` : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const handleAwardBid = async (contractId: string, bidId: string) => {
        const res = await fetch(`/api/mayor/contracts/${contractId}/award`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, bidId }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Contract awarded.' : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const s = { panel: { background: '#0f172a', borderRadius: 12, padding: 24, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }, tab: (active: boolean) => ({ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: active ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'transparent', color: active ? 'white' : '#94a3b8' }), card: { background: '#1e293b', borderRadius: 8, padding: '14px 16px', marginBottom: 10 } };

    return (
        <div style={s.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏛️</div>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mayor's Office — {city?.name ?? 'Loading...'}</h2><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Manage your municipality, taxes, and contracts</p></div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', borderRadius: 8, padding: 4 }}>
                {(['overview', 'contracts', 'settings'] as const).map(t => <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>{t === 'overview' ? '📊 Overview' : t === 'contracts' ? '📋 Contracts' : '⚙️ Settings'}</button>)}
            </div>
            {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</div>}
            {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : !city ? <div style={{ textAlign: 'center', color: '#ef4444', padding: 40 }}>No municipality found. Contact admin to set up your city.</div> : tab === 'overview' ? (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={s.card}><div style={{ fontSize: 12, color: '#94a3b8' }}>Tax Reserve</div><div style={{ fontSize: 22, fontWeight: 700, color: '#0ea5e9', fontFamily: 'monospace' }}>Δ{city.deltaReserve.toFixed(2)}</div></div>
                        <div style={s.card}><div style={{ fontSize: 12, color: '#94a3b8' }}>Goods Tax Rate</div><div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{(city.goodsTaxRate * 100).toFixed(1)}%</div></div>
                    </div>
                    <div style={s.card}><div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Open Contracts</div><div style={{ fontWeight: 700, fontSize: 18 }}>{city.contracts.filter(c => c.status === 'OPEN').length} active</div></div>
                </div>
            ) : tab === 'contracts' ? (
                <div>
                    <form onSubmit={handleIssueContract} style={{ ...s.card, marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📋 Issue New Procurement Contract</div>
                        <select required value={contractForm.goodId} onChange={e => setContractForm(p => ({ ...p, goodId: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', marginBottom: 8 }}>
                            <option value="">Select Good...</option>
                            {allGoods.map((g: any) => <option key={g.id} value={g.id}>{g.name} ({g.unit})</option>)}
                        </select>
                        {[{ label: 'Quantity Required', key: 'quantityRequired', ph: '500' }, { label: 'Max Budget (Δ)', key: 'budgetDelta', ph: '10000' }, { label: 'Days Until Deadline', key: 'daysUntilDeadline', ph: '7' }].map(f => (
                            <input key={f.key} type="number" placeholder={f.label + ': ' + f.ph} required value={(contractForm as any)[f.key]} onChange={e => setContractForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', marginBottom: 8, boxSizing: 'border-box' as any }} />
                        ))}
                        <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white', fontWeight: 700 }}>Issue Contract</button>
                    </form>
                    {city.contracts.map(c => (
                        <div key={c.id} style={s.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div><div style={{ fontWeight: 700 }}>{c.good.name} — {c.quantityRequired} {c.good.unit}s</div><div style={{ fontSize: 12, color: '#94a3b8' }}>Budget: Δ{c.budgetDelta} · Deadline: {new Date(c.deadline).toLocaleDateString()}</div></div>
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.status === 'OPEN' ? '#22c55e20' : '#f59e0b20', color: c.status === 'OPEN' ? '#22c55e' : '#f59e0b' }}>{c.status}</span>
                            </div>
                            {c.bids.length > 0 && <div>{c.bids.map(b => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #334155' }}><span style={{ fontSize: 13, color: '#94a3b8' }}>{b.bidder.username} — Δ{b.pricePerUnit}/unit</span>{c.status === 'OPEN' && <button onClick={() => handleAwardBid(c.id, b.id)} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: 'white', fontSize: 12, fontWeight: 700 }}>Award</button>}</div>)}</div>}
                            {c.bids.length === 0 && <div style={{ fontSize: 12, color: '#475569' }}>No bids yet.</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={s.card}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Goods Transaction Tax Rate</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}><span style={{ color: '#94a3b8' }}>Rate</span><span style={{ fontWeight: 700, color: '#0ea5e9' }}>{taxRate}%</span></div>
                    <input type="range" min={0} max={10} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ width: '100%', marginBottom: 16, accentColor: '#0ea5e9' }} />
                    <button onClick={handleSetTax} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white', fontWeight: 700 }}>Apply Tax Rate</button>
                </div>
            )}
        </div>
    );
}
