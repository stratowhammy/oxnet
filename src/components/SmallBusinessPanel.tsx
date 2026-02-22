'use client';
import { useState, useEffect, useCallback } from 'react';

interface MunicipalContract { id: string; status: string; quantityRequired: number; budgetDelta: number; deadline: string; municipality: { name: string }; good: { name: string; unit: string }; }
interface GoodInventory { id: string; quantity: number; good: { name: string; unit: string; listPrice: number } }

export default function SmallBusinessPanel({ userId, assetId }: { userId: string; assetId?: string }) {
    const [openContracts, setOpenContracts] = useState<MunicipalContract[]>([]);
    const [myBids, setMyBids] = useState<any[]>([]);
    const [inventory, setInventory] = useState<GoodInventory[]>([]);
    const [allGoods, setAllGoods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'markets' | 'contracts' | 'inventory'>('contracts');
    const [msg, setMsg] = useState('');
    const [bidForm, setBidForm] = useState<Record<string, string>>({});
    const [buyForm, setBuyForm] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        const [contractsRes, goodsRes, invRes] = await Promise.all([
            fetch('/api/mayor/contracts?status=OPEN'),
            fetch('/api/goods'),
            assetId ? fetch(`/api/goods/inventory?assetId=${assetId}`) : Promise.resolve({ json: () => [] })
        ]);
        const [contractsData, goodsData, invData] = await Promise.all([contractsRes.json(), goodsRes.json(), invRes.json()]);
        setOpenContracts(Array.isArray(contractsData) ? contractsData : []);
        setAllGoods(Array.isArray(goodsData) ? goodsData : []);
        setInventory(Array.isArray(invData) ? invData : []);
        setLoading(false);
    }, [userId, assetId]);

    useEffect(() => { load(); }, [load]);

    const handleBid = async (contractId: string) => {
        const price = Number(bidForm[contractId]);
        if (!price) { setMsg('❌ Enter a price per unit.'); return; }
        const res = await fetch('/api/mayor/contracts/bid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, contractId, pricePerUnit: price }) });
        const d = await res.json();
        setMsg(res.ok ? '✅ Bid submitted!' : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const handleBuyWholesale = async (goodId: string) => {
        const qty = Number(buyForm[goodId] || 1);
        const res = await fetch('/api/goods/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, goodId, quantity: qty }) });
        const d = await res.json();
        setMsg(res.ok ? `✅ Purchased ${qty} units.` : `❌ ${d.error}`);
        if (res.ok) load();
    };

    const st = { panel: { background: '#0f172a', borderRadius: 12, padding: 24, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }, card: { background: '#1e293b', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }, tab: (a: boolean) => ({ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: a ? 'linear-gradient(135deg, #10b981, #0ea5e9)' : 'transparent', color: a ? 'white' : '#94a3b8' }) };

    return (
        <div style={st.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏪</div>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Small Business Operations</h2><p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Buy wholesale, bid on municipal contracts, manage inventory</p></div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', borderRadius: 8, padding: 4 }}>
                {(['contracts', 'markets', 'inventory'] as const).map(t => <button key={t} onClick={() => setTab(t)} style={st.tab(tab === t)}>{t === 'contracts' ? '📋 Gov Contracts' : t === 'markets' ? '🛒 Wholesale' : '📦 My Inventory'}</button>)}
            </div>
            {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{msg}</div>}
            {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : tab === 'contracts' ? (
                openContracts.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 40, border: '2px dashed #1e293b', borderRadius: 8 }}>No open government contracts right now.</div>
                    : openContracts.map(c => (
                        <div key={c.id} style={st.card}>
                            <div style={{ fontWeight: 700 }}>{c.municipality.name} — {c.good.name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{c.quantityRequired} {c.good.unit}s · Budget Δ{c.budgetDelta} · Due {new Date(c.deadline).toLocaleDateString()}</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="number" placeholder="Your price/unit" value={bidForm[c.id] || ''} onChange={e => setBidForm(p => ({ ...p, [c.id]: e.target.value }))} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
                                <button onClick={() => handleBid(c.id)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#10b981', color: 'white', fontWeight: 700, fontSize: 13 }}>Bid</button>
                            </div>
                        </div>
                    ))
            ) : tab === 'markets' ? (
                allGoods.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 40, border: '2px dashed #1e293b', borderRadius: 8 }}>No goods listed on the market yet.</div>
                    : allGoods.map((g: any) => (
                        <div key={g.id} style={st.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div><div style={{ fontWeight: 700 }}>{g.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{g.producer?.symbol} · Δ{g.listPrice}/{g.unit}</div></div>
                                <span style={{ fontSize: 12, color: '#64748b' }}>{g.currentStockLevel?.toFixed(0)} in stock</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="number" min={1} placeholder="Qty" value={buyForm[g.id] || ''} onChange={e => setBuyForm(p => ({ ...p, [g.id]: e.target.value }))} style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
                                <button onClick={() => handleBuyWholesale(g.id)} style={{ flex: 1, padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#0ea5e9', color: 'white', fontWeight: 700, fontSize: 13 }}>Buy Wholesale</button>
                            </div>
                        </div>
                    ))
            ) : (
                inventory.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 40, border: '2px dashed #1e293b', borderRadius: 8 }}>No inventory yet.</div>
                    : inventory.map(inv => (
                        <div key={inv.id} style={{ ...st.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><div style={{ fontWeight: 700 }}>{inv.good.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>Market price: Δ{inv.good.listPrice}/{inv.good.unit}</div></div>
                            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{inv.quantity.toFixed(0)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.good.unit}s</div></div>
                        </div>
                    ))
            )}
        </div>
    );
}
