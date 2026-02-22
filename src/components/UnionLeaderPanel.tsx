'use client';
import { useState, useEffect, useCallback } from 'react';

interface StrikeAction { id: string; reason: string; isActive: boolean; startedAt: string; endedAt?: string; }
interface WorkforcePool { id: string; memberCount: number; wagesDemand: number; facility: { wages: number; headcount: number; onStrike: boolean; asset: { symbol: string; name: string } }; strikes: StrikeAction[]; }

export default function UnionLeaderPanel({ userId }: { userId: string }) {
    const [pool, setPool] = useState<WorkforcePool | null>(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [wagesDemand, setWagesDemand] = useState(50);
    const [strikeReason, setStrikeReason] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/union?userId=${userId}`);
        const data = await res.json();
        if (data && !data.error) { setPool(data); setWagesDemand(data.wagesDemand); }
        setLoading(false);
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const handleNegotiate = async () => {
        const res = await fetch('/api/union/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, wagesDemand }) });
        const d = await res.json();
        setMsg(res.ok ? `✅ Wage demand set to Δ${wagesDemand}/worker/cycle.` : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const handleStrike = async () => {
        if (!strikeReason.trim()) { setMsg('❌ Strike reason required.'); return; }
        const res = await fetch('/api/union/strike', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, strikeReason, action: 'START' }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Strike called! Production is halted until wages are met.' : `❌ ${d.error}`);
        setStrikeReason('');
        if (res.ok) load();
    };

    const handleEndStrike = async (strikeId: string) => {
        const res = await fetch('/api/union/strike', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, strikeId, action: 'END' }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Strike ended. Production resumes.' : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const s = { panel: { background: '#0f172a', borderRadius: 12, padding: 24, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }, card: { background: '#1e293b', borderRadius: 8, padding: '14px 16px', marginBottom: 10 } };
    const onStrike = pool?.facility?.onStrike;

    return (
        <div style={s.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔩</div>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Union Office — {pool?.facility?.asset?.symbol ?? '...'}</h2><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Negotiate wages and protect workers</p></div>
            </div>

            {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</div>}
            {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : !pool ? <div style={{ textAlign: 'center', color: '#ef4444', padding: 40 }}>No workforce pool assigned. Contact admin.</div> : (
                <>
                    {onStrike && <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>⚠️ Factory is currently ON STRIKE — production halted</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={s.card}><div style={{ fontSize: 11, color: '#94a3b8' }}>Members</div><div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{pool.memberCount}</div></div>
                        <div style={s.card}><div style={{ fontSize: 11, color: '#94a3b8' }}>Union Demand</div><div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>Δ{pool.wagesDemand}</div></div>
                        <div style={s.card}><div style={{ fontSize: 11, color: '#94a3b8' }}>Factory Pays</div><div style={{ fontSize: 20, fontWeight: 700, color: pool.facility.wages >= pool.wagesDemand ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>Δ{pool.facility.wages}</div></div>
                    </div>

                    {/* Wage negotiation */}
                    <div style={{ ...s.card, marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 10 }}>💬 Set Wage Demand</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: '#94a3b8' }}>Demand</span><span style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>Δ{wagesDemand}/worker/cycle</span></div>
                        <input type="range" min={10} max={500} value={wagesDemand} onChange={e => setWagesDemand(Number(e.target.value))} style={{ width: '100%', marginBottom: 12, accentColor: '#f59e0b' }} />
                        <button onClick={handleNegotiate} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', fontWeight: 700 }}>Submit Wage Demand</button>
                    </div>

                    {/* Strike controls */}
                    {!onStrike ? (
                        <div style={s.card}>
                            <div style={{ fontWeight: 700, marginBottom: 10, color: '#ef4444' }}>🪧 Call a Strike</div>
                            <input type="text" placeholder="Reason for strike..." value={strikeReason} onChange={e => setStrikeReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ef444440', background: '#0f172a', color: '#e2e8f0', marginBottom: 10, boxSizing: 'border-box' as any }} />
                            <button onClick={handleStrike} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ef4444', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700 }}>Call Strike</button>
                        </div>
                    ) : (
                        <div style={s.card}>
                            <div style={{ fontWeight: 700, marginBottom: 10 }}>Active Strikes</div>
                            {pool.strikes.filter(s => s.isActive).map(strike => (
                                <div key={strike.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>"{strike.reason}"</div>
                                    <button onClick={() => handleEndStrike(strike.id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: 'white', fontSize: 12, fontWeight: 700 }}>End Strike</button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
