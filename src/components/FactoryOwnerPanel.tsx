'use client';
import { useState, useEffect, useCallback } from 'react';

interface ProductionFacility {
    id: string;
    maxCapacity: number;
    currentCapacity: number;
    wages: number;
    headcount: number;
    onStrike: boolean;
    asset: { symbol: string; name: string };
    workforcePool?: { memberCount: number; wagesDemand: number; strikes: { isActive: boolean; reason: string }[] };
}

export default function FactoryOwnerPanel({ userId }: { userId: string }) {
    const [facility, setFacility] = useState<ProductionFacility | null>(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [wages, setWages] = useState(50);
    const [headcount, setHeadcount] = useState(10);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/factory?userId=${userId}`);
        const data = await res.json();
        if (data && !data.error) { setFacility(data); setWages(data.wages); setHeadcount(data.headcount); }
        setLoading(false);
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const handleUpdate = async () => {
        const res = await fetch('/api/factory', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, wages, headcount }) });
        const d = await res.json();
        setMsg(res.ok ? `✅ Factory updated — Δ${wages}/worker · ${headcount} workers` : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const capacityPct = facility ? Math.round((facility.currentCapacity / Math.max(1, facility.maxCapacity)) * 100) : 0;
    const unionDemand = facility?.workforcePool?.wagesDemand ?? 0;
    const wageMet = wages >= unionDemand;
    const s = { panel: { background: '#0f172a', borderRadius: 12, padding: 24, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }, card: { background: '#1e293b', borderRadius: 8, padding: '14px 16px', marginBottom: 10 } };

    return (
        <div style={s.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #f97316, #ef4444)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏭</div>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Factory — {facility?.asset?.symbol ?? '...'}</h2><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Manage your production facility, workers, and wages</p></div>
            </div>

            {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</div>}

            {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : !facility ? <div style={{ textAlign: 'center', color: '#ef4444', padding: 40 }}>No factory found. Contact admin.</div> : (
                <>
                    {facility.onStrike && (
                        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', fontWeight: 700, color: '#ef4444' }}>
                            ⚠️ STRIKE ACTIVE — Production halted. Settle wage dispute to resume.
                            {facility.workforcePool?.strikes.filter(s => s.isActive).map((s, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, marginTop: 4, color: '#f87171' }}>"{s.reason}"</div>)}
                        </div>
                    )}

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={s.card}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Capacity</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: facility.onStrike ? '#ef4444' : '#f97316' }}>{capacityPct}%</div>
                        </div>
                        <div style={s.card}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Workers</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{facility.headcount}</div>
                        </div>
                        <div style={s.card}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Union Demand</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: wageMet ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>Δ{unionDemand}</div>
                        </div>
                    </div>

                    {/* Capacity bar */}
                    <div style={{ ...s.card, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}><span>Production Capacity</span><span>{facility.currentCapacity} / {facility.maxCapacity} units/cycle</span></div>
                        <div style={{ background: '#0f172a', borderRadius: 6, overflow: 'hidden', height: 10 }}>
                            <div style={{ height: '100%', background: facility.onStrike ? '#ef4444' : `linear-gradient(90deg, #f97316, #ef4444)`, width: `${capacityPct}%`, transition: 'width 0.5s' }} />
                        </div>
                    </div>

                    {/* Wage & headcount controls */}
                    <div style={s.card}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>⚙️ Factory Controls</div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                                <span>Wages per Worker/Cycle</span>
                                <span style={{ fontWeight: 700, color: wageMet ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>Δ{wages} {!wageMet && `(Union wants Δ${unionDemand})`}</span>
                            </div>
                            <input type="range" min={10} max={500} value={wages} onChange={e => setWages(Number(e.target.value))} style={{ width: '100%', accentColor: wageMet ? '#22c55e' : '#ef4444' }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                                <span>Headcount</span>
                                <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{headcount} workers</span>
                            </div>
                            <input type="range" min={1} max={200} value={headcount} onChange={e => setHeadcount(Number(e.target.value))} style={{ width: '100%', accentColor: '#f97316' }} />
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                            Wage bill: <strong style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>Δ{(wages * headcount).toLocaleString()}/cycle</strong>
                        </div>
                        <button onClick={handleUpdate} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', fontWeight: 700 }}>Update Factory Settings</button>
                    </div>
                </>
            )}
        </div>
    );
}
