'use client';

import { useState, useEffect, useCallback } from 'react';

interface GoodInventory {
    id: string;
    quantity: number;
    good: { id: string; name: string; unit: string; listPrice: number; isListedForSale: boolean };
}

interface SupplyContract {
    id: string;
    status: string;
    pricePerUnit: number;
    unitsPerCycle: number;
    autoRenew: boolean;
    buyer: { name: string; symbol: string };
    seller: { name: string; symbol: string };
    good: { name: string; unit: string };
}

interface ProductionPanelProps {
    userId: string;
    assetId: string;
    assetSymbol: string;
}

export default function ProductionPanel({ userId, assetId, assetSymbol }: ProductionPanelProps) {
    const [inventory, setInventory] = useState<GoodInventory[]>([]);
    const [contracts, setContracts] = useState<SupplyContract[]>([]);
    const [activeTab, setActiveTab] = useState<'production' | 'contracts' | 'list'>('production');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // New good form state
    const [newGood, setNewGood] = useState({ name: '', unit: '', baseProductionCost: '', listPrice: '', isListedForSale: false });

    // New contract form state
    const [contractForm, setContractForm] = useState({ buyerId: '', goodId: '', pricePerUnit: '', unitsPerCycle: '' });
    const [availableGoods, setAvailableGoods] = useState<any[]>([]);
    const [allAssets, setAllAssets] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [invRes, contractRes, goodsRes] = await Promise.all([
                fetch(`/api/goods/inventory?assetId=${assetId}`),
                fetch(`/api/contracts?assetId=${assetId}`),
                fetch('/api/goods')
            ]);
            const [invData, contractData, goodsData] = await Promise.all([
                invRes.json(), contractRes.json(), goodsRes.json()
            ]);
            setInventory(Array.isArray(invData) ? invData : []);
            setContracts(Array.isArray(contractData) ? contractData : []);
            setAvailableGoods(Array.isArray(goodsData) ? goodsData : []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [assetId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleListGood = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        const res = await fetch('/api/goods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ...newGood, baseProductionCost: Number(newGood.baseProductionCost), listPrice: Number(newGood.listPrice) })
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`✅ "${data.name}" created and ${data.isListedForSale ? 'listed' : 'saved'}.`);
            setNewGood({ name: '', unit: '', baseProductionCost: '', listPrice: '', isListedForSale: false });
            fetchData();
        } else {
            setMessage(`❌ ${data.error}`);
        }
    };

    const handleContractAction = async (contractId: string, action: 'ACCEPT' | 'BREAK') => {
        const res = await fetch(`/api/contracts/${contractId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action })
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`✅ Contract ${action === 'ACCEPT' ? 'accepted' : 'broken'}.`);
            fetchData();
        } else {
            setMessage(`❌ ${data.error}`);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return '#22c55e';
            case 'PENDING': return '#f59e0b';
            case 'BROKEN': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏭</div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{assetSymbol} — Production Management</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Manage goods production, inventory, and supply contracts</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#1e293b', borderRadius: '8px', padding: '4px' }}>
                {(['production', 'contracts', 'list'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize',
                            background: activeTab === tab ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            color: activeTab === tab ? 'white' : '#94a3b8'
                        }}>
                        {tab === 'production' ? '📦 Inventory' : tab === 'contracts' ? '🤝 Contracts' : '🏪 List Goods'}
                    </button>
                ))}
            </div>

            {message && (
                <div style={{
                    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
                    background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.startsWith('✅') ? '#22c55e' : '#ef4444'}`,
                    color: message.startsWith('✅') ? '#22c55e' : '#ef4444'
                }}>
                    {message}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading...</div>
            ) : activeTab === 'production' ? (
                <div>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
                        Your company's current goods inventory. Production cycles run every 10 minutes.
                    </p>
                    {inventory.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#475569', padding: '40px', border: '2px dashed #1e293b', borderRadius: '8px' }}>
                            No inventory yet. Use the "List Goods" tab to create your first good.
                        </div>
                    ) : inventory.map(inv => (
                        <div key={inv.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{inv.good.name}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{inv.good.unit} · Listed: {inv.good.isListedForSale ? `Δ${inv.good.listPrice.toFixed(2)}` : 'Not listed'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#6366f1' }}>{inv.quantity.toFixed(0)}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>units on hand</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'contracts' ? (
                <div>
                    {contracts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#475569', padding: '40px', border: '2px dashed #1e293b', borderRadius: '8px' }}>
                            No active contracts. Use the goods market to find suppliers or offer contracts to buyers.
                        </div>
                    ) : contracts.map(c => (
                        <div key={c.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{c.good.name} — {c.unitsPerCycle} {c.good.unit}/cycle @ Δ{c.pricePerUnit}</div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                        {c.seller.symbol} → {c.buyer.symbol}
                                    </div>
                                </div>
                                <span style={{
                                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                    background: `${getStatusColor(c.status)}20`, color: getStatusColor(c.status)
                                }}>
                                    {c.status}
                                </span>
                            </div>
                            {c.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button onClick={() => handleContractAction(c.id, 'ACCEPT')}
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#22c55e', color: 'white', fontSize: '12px', fontWeight: 600 }}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleContractAction(c.id, 'BREAK')}
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 600 }}>
                                        Decline
                                    </button>
                                </div>
                            )}
                            {c.status === 'ACTIVE' && (
                                <button onClick={() => handleContractAction(c.id, 'BREAK')}
                                    style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #ef4444', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                                    Break Contract (−3% penalty)
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <form onSubmit={handleListGood}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                        Define a good your company produces. Once created, production cycles will automatically generate units each tick.
                    </p>
                    {[
                        { label: 'Good Name', key: 'name', placeholder: 'e.g. "Silicon Wafer"', type: 'text' },
                        { label: 'Unit of Measure', key: 'unit', placeholder: 'e.g. "wafer", "barrel", "kWh"', type: 'text' },
                        { label: 'Production Cost (Δ per unit)', key: 'baseProductionCost', placeholder: '5.00', type: 'number' },
                        { label: 'List Price (Δ per unit)', key: 'listPrice', placeholder: '12.00', type: 'number' },
                    ].map(field => (
                        <div key={field.key} style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>{field.label}</label>
                            <input type={field.type} placeholder={field.placeholder}
                                value={(newGood as any)[field.key]}
                                onChange={e => setNewGood(prev => ({ ...prev, [field.key]: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
                        <input type="checkbox" checked={newGood.isListedForSale}
                            onChange={e => setNewGood(prev => ({ ...prev, isListedForSale: e.target.checked }))} />
                        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>List immediately on the marketplace</span>
                    </label>
                    <button type="submit"
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: '14px'
                        }}>
                        Create Good
                    </button>
                </form>
            )}
        </div>
    );
}
