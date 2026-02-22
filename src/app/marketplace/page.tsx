'use client';

import { useState, useEffect } from 'react';

interface Good {
    id: string;
    name: string;
    unit: string;
    listPrice: number;
    currentStockLevel: number;
    producer: { name: string; symbol: string; sector: string };
}

export default function MarketplacePage() {
    const [goods, setGoods] = useState<Good[]>([]);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [messages, setMessages] = useState<Record<string, string>>({});
    const [userId, setUserId] = useState<string>('');

    useEffect(() => {
        // Get userId from session via API
        fetch('/api/auth/me').then(r => r.json()).then(d => setUserId(d?.id ?? ''));
        fetchGoods();
    }, []);

    const fetchGoods = async () => {
        setLoading(true);
        const res = await fetch('/api/goods');
        const data = await res.json();
        setGoods(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    const handlePurchase = async (good: Good) => {
        const qty = quantities[good.id] || 1;
        const res = await fetch('/api/goods/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, goodId: good.id, quantity: qty })
        });
        const data = await res.json();
        setMessages(prev => ({
            ...prev,
            [good.id]: res.ok ? `✅ Purchased ${qty} ${good.unit}(s) for Δ${data.totalCost?.toFixed(2)}` : `❌ ${data.error}`
        }));
        if (res.ok) fetchGoods();
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Back to Dashboard</a>
                    <span style={{ color: '#334155' }}>|</span>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'white' }}>🏪 Goods Marketplace</h1>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Buy physical goods produced by companies — drives real demand signals</p>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '80px' }}>Loading marketplace...</div>
                ) : goods.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', border: '2px dashed #1e293b', borderRadius: '12px', color: '#475569' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                        <h2>No goods listed yet</h2>
                        <p>CEOs can list their company's goods using the Production Management panel in the dashboard.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {goods.map(good => (
                            <div key={good.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Good Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>{good.name}</h3>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{good.unit} · {good.producer.sector}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>Δ{good.listPrice.toFixed(2)}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>per {good.unit}</div>
                                    </div>
                                </div>

                                {/* Producer */}
                                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Produced by</div>
                                        <div style={{ fontWeight: 700, color: 'white' }}>{good.producer.name}</div>
                                    </div>
                                    <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: '#6366f1', fontWeight: 700, border: '1px solid #6366f140' }}>
                                        {good.producer.symbol}
                                    </span>
                                </div>

                                {/* Stock Level */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#94a3b8' }}>Stock Available</span>
                                    <span style={{ fontWeight: 700, color: good.currentStockLevel < 50 ? '#f59e0b' : '#22c55e', fontFamily: 'monospace' }}>
                                        {good.currentStockLevel.toFixed(0)} {good.unit}s
                                    </span>
                                </div>

                                {/* Purchase Controls */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={good.currentStockLevel}
                                        value={quantities[good.id] || 1}
                                        onChange={e => setQuantities(prev => ({ ...prev, [good.id]: Number(e.target.value) }))}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '14px' }}
                                    />
                                    <button
                                        onClick={() => handlePurchase(good)}
                                        disabled={!userId || good.currentStockLevel <= 0}
                                        style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: '14px', opacity: (!userId || good.currentStockLevel <= 0) ? 0.5 : 1 }}
                                    >
                                        Buy
                                    </button>
                                </div>

                                {/* Total cost preview */}
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    Total: <strong style={{ color: '#e2e8f0' }}>Δ{((quantities[good.id] || 1) * good.listPrice).toFixed(2)}</strong>
                                </div>

                                {/* Feedback message */}
                                {messages[good.id] && (
                                    <div style={{
                                        padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                                        background: messages[good.id].startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: messages[good.id].startsWith('✅') ? '#22c55e' : '#ef4444'
                                    }}>
                                        {messages[good.id]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
