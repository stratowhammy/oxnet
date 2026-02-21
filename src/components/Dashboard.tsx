'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { calculateSMA, Candle } from '@/lib/indicators';
import { z } from 'zod';

// --- Types ---
type Asset = {
    id: string;
    symbol: string;
    name: string;
    type: string;
    sector: string;
    niche: string;
    description: string;
    basePrice: number;
    supplyPool: number;
    demandPool: number;
};

type PortfolioItem = {
    assetId: string;
    quantity: number;
    averageEntryPrice: number;
    asset: Asset;
};

type User = {
    id: string;
    deltaBalance: number;
    portfolios: PortfolioItem[];
};

// --- Mock Data Generator (moved from TradingInterface) ---
function generateData(count: number, basePrice: number): Candle[] {
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    // Start a bit back
    date.setDate(date.getDate() - count);

    let previousClose = basePrice;
    const result: Candle[] = [];
    for (let i = 0; i < count; i++) {
        const volatility = basePrice * 0.02; // 2% volatility
        const open = previousClose;
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = (open + high + low) / 3; // roughly avg
        previousClose = close;

        const time = date.toISOString().split('T')[0];
        result.push({ time, open, high, low, close });
        date.setDate(date.getDate() + 1);
    }
    return result;
}

const orderSchema = z.object({
    quantity: z.number().positive(),
});

export default function Dashboard({ initialUser, initialAssets }: { initialUser: User, initialAssets: Asset[] }) {
    // --- State: Layout & Selection ---
    const [selectedAssetId, setSelectedAssetId] = useState<string>(initialAssets[0]?.id || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('All');

    // --- State: Data ---
    const [user, setUser] = useState<User>(initialUser);
    const [assets, setAssets] = useState<Asset[]>(initialAssets);

    // Derived
    const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId), [assets, selectedAssetId]);
    const sectors = useMemo(() => ['All', ...Array.from(new Set(assets.map(a => a.sector))).sort()], [assets]);

    // Filtered Assets
    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesSearch = a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSector = filterSector === 'All' || a.sector === filterSector;
            return matchesSearch && matchesSector;
        });
    }, [assets, searchTerm, filterSector]);

    // --- State: Charting ---
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [chartData, setChartData] = useState<Candle[]>([]);

    // SMA Toggles
    const [showSMA10, setShowSMA10] = useState(false);
    const [showSMA20, setShowSMA20] = useState(false);
    const [showSMA50, setShowSMA50] = useState(false);

    // --- State: Trading ---
    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
    const [quantity, setQuantity] = useState<number>(0);
    const [impact, setImpact] = useState<{ impact: number; estimatedTotal: number; fee: number } | null>(null);
    const [impactLoading, setImpactLoading] = useState(false);

    // --- Effects: Chart Data ---
    useEffect(() => {
        if (!selectedAsset) return;
        // Mock fetch new data for selected asset
        const data = generateData(200, selectedAsset.basePrice);
        setChartData(data);
    }, [selectedAsset]);

    // --- Effects: Chart Rendering ---
    const sma10 = useMemo(() => calculateSMA(chartData, 10), [chartData]);
    const sma20 = useMemo(() => calculateSMA(chartData, 20), [chartData]);
    const sma50 = useMemo(() => calculateSMA(chartData, 50), [chartData]);

    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#111827' }, // gray-900
                textColor: '#d1d5db',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#374151' },
                horzLines: { color: '#374151' },
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981', wickDownColor: '#ef4444',
        });
        candlestickSeries.setData(chartData);

        const sma10Series = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 1, title: 'SMA 10' });
        const sma20Series = chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, title: 'SMA 20' });
        const sma50Series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'SMA 50' });

        if (showSMA10) sma10Series.setData(sma10);
        if (showSMA20) sma20Series.setData(sma20);
        if (showSMA50) sma50Series.setData(sma50);

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [chartData, showSMA10, showSMA20, showSMA50, sma10, sma20, sma50]);

    // --- Effects: Price Impact ---
    useEffect(() => {
        if (quantity <= 0 || !selectedAsset) {
            setImpact(null);
            return;
        }

        const handler = setTimeout(async () => {
            setImpactLoading(true);
            try {
                const parse = orderSchema.safeParse({ quantity });
                if (!parse.success) return;

                const res = await fetch('/api/price-impact', {
                    method: 'POST',
                    body: JSON.stringify({ assetId: selectedAsset.id, amount: quantity, isBuy: orderType === 'BUY' })
                });
                const json = await res.json();
                if (res.ok) setImpact(json);
            } catch (e) {
                console.error(e);
            } finally {
                setImpactLoading(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [quantity, orderType, selectedAsset]);

    // --- Handlers ---
    const handleOrderSubmit = async () => {
        if (quantity <= 0 || !selectedAsset) return;
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user.id,
                    assetId: selectedAsset.id,
                    type: orderType,
                    quantity
                })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Trade Successful: ${json.message}`);
                // Optimistically update or fetch user... for now reload page or we can fetch updated user
                window.location.reload();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Trade failed');
        }
    };

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
            {/* --- Left Sidebar: Market Browser --- */}
            <aside className="w-80 flex flex-col border-r border-gray-800 bg-gray-900">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white mb-4">Marketplace</h2>
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 mb-2"
                    />
                    <select
                        value={filterSector}
                        onChange={(e) => setFilterSector(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                        {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            onClick={() => setSelectedAssetId(asset.id)}
                            className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${selectedAssetId === asset.id ? 'bg-gray-800 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-white">{asset.symbol}</span>
                                <span className="text-sm text-gray-400">Δ {asset.basePrice.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">{asset.name}</div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* --- Main Content --- */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header: Portfolio Summary */}
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900">
                    <div>
                        <span className="text-gray-400 text-sm">Portfolio Value</span>
                        {/* Approx value calculation could go here, for now just Delta */}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-xs text-gray-400">Available Delta</div>
                            <div className="text-xl font-mono font-bold text-green-400">Δ {user.deltaBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
                            {user.id.substring(0, 2).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-12 gap-6">

                    {selectedAsset ? (
                        <>
                            {/* Asset Header & Chart (Col 8) */}
                            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                                {/* Asset Info Card */}
                                <div className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h1 className="text-3xl font-bold text-white mb-1">{selectedAsset.name} <span className="text-gray-500 text-lg font-normal">({selectedAsset.symbol})</span></h1>
                                            <div className="flex gap-2 text-sm">
                                                <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded border border-blue-800">{selectedAsset.sector}</span>
                                                <span className="bg-purple-900 text-purple-200 px-2 py-0.5 rounded border border-purple-800">{selectedAsset.type}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-mono font-bold">Δ {selectedAsset.basePrice.toFixed(2)}</div>
                                            {/* Simulate a 24h change */}
                                            <div className="text-green-500 font-mono text-sm">+2.4% (Mock)</div>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                        {selectedAsset.description}
                                    </p>
                                    <div className="text-xs text-gray-500">
                                        <span className="font-semibold text-gray-400">Specialization:</span> {selectedAsset.niche}
                                    </div>
                                </div>

                                {/* Chart Card */}
                                <div className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800 flex-1 min-h-[450px] flex flex-col">
                                    <div className="flex justify-between items-center mb-2 px-2">
                                        <h3 className="font-semibold text-gray-300">Price History</h3>
                                        <div className="flex gap-3 text-xs">
                                            <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA10} onChange={e => setShowSMA10(e.target.checked)} className="accent-blue-500" /> SMA 10</label>
                                            <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA20} onChange={e => setShowSMA20(e.target.checked)} className="accent-blue-500" /> SMA 20</label>
                                            <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA50} onChange={e => setShowSMA50(e.target.checked)} className="accent-blue-500" /> SMA 50</label>
                                        </div>
                                    </div>
                                    <div ref={chartContainerRef} className="flex-1 w-full" />
                                </div>
                            </div>

                            {/* Sidebar Right: Buying/Portfolio (Col 4) */}
                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                                {/* Trading Panel */}
                                <div className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800">
                                    <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Trade {selectedAsset.symbol}</h3>

                                    <div className="flex bg-gray-800 rounded p-1 mb-6">
                                        <button
                                            onClick={() => setOrderType('BUY')}
                                            className={`flex-1 py-1.5 rounded text-sm font-semibold transition-all ${orderType === 'BUY' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            Buy
                                        </button>
                                        <button
                                            onClick={() => setOrderType('SELL')}
                                            className={`flex-1 py-1.5 rounded text-sm font-semibold transition-all ${orderType === 'SELL' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            Sell
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseFloat(e.target.value))}
                                            className="w-full bg-gray-950 border border-gray-700 text-white p-3 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="bg-gray-950 rounded p-4 mb-6 border border-gray-800">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">Price Impact</span>
                                            <span className={`font-mono ${impact?.impact && impact.impact > 1 ? 'text-red-500' : 'text-green-500'}`}>
                                                {impactLoading ? '...' : impact ? `${impact.impact.toFixed(4)}%` : '--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">Est. Fee (0.5%)</span>
                                            <span className="font-mono text-gray-300">
                                                {impactLoading ? '...' : impact ? `Δ ${impact.fee.toFixed(2)}` : '--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold border-t border-gray-800 pt-2 mt-2">
                                            <span className="text-gray-300">Total</span>
                                            <span className="font-mono text-white text-lg">
                                                {impactLoading ? '...' : impact ? `Δ ${impact.estimatedTotal.toFixed(2)}` : '--'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleOrderSubmit}
                                        disabled={quantity <= 0 || impactLoading}
                                        className={`w-full py-3 rounded font-bold text-white shadow-lg transition-all ${orderType === 'BUY' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {orderType} {selectedAsset.symbol}
                                    </button>
                                </div>

                                {/* Current Position Panel */}
                                <div className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800 flex-1">
                                    <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Your Position</h3>
                                    {(() => {
                                        const position = user.portfolios.find(p => p.assetId === selectedAsset.id);
                                        if (!position) return <div className="text-gray-500 text-sm text-center py-4">No open position</div>;

                                        const marketValue = position.quantity * selectedAsset.basePrice; // approx
                                        const pnl = (selectedAsset.basePrice - position.averageEntryPrice) * position.quantity;
                                        const isProfitable = pnl >= 0;

                                        return (
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 text-sm">Quantity</span>
                                                    <span className="text-white font-mono">{position.quantity}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 text-sm">Avg Entry</span>
                                                    <span className="text-white font-mono">Δ {position.averageEntryPrice.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-gray-800 pt-2">
                                                    <span className="text-gray-400 text-sm">Value</span>
                                                    <span className="text-white font-mono">Δ {marketValue.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 text-sm">Unrealized PnL</span>
                                                    <span className={`font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                                        {isProfitable ? '+' : ''}{pnl.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                            </div>
                        </>
                    ) : (
                        <div className="col-span-12 flex items-center justify-center text-gray-500">
                            Select an asset to view details
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
