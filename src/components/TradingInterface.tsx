'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { calculateSMA, Candle } from '@/lib/indicators';
import { z } from 'zod';

// Mock Data Generator for demo
function generateData(count: number): Candle[] {
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    let previousClose = 100;
    const result: Candle[] = [];
    for (let i = 0; i < count; i++) {
        const open = previousClose;
        const high = open + Math.random() * 2;
        const low = open - Math.random() * 2;
        const close = (open + high + low) / 3;
        previousClose = close;
        // Format YYYY-MM-DD
        const time = date.toISOString().split('T')[0];
        result.push({ time, open, high, low, close });
        date.setDate(date.getDate() + 1);
    }
    return result;
}

const orderSchema = z.object({
    quantity: z.number().positive(),
});

export default function TradingInterface({ initialAssets }: { initialAssets: { id: string; symbol: string; type: string; basePrice: number }[] }) {
    const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0]?.id || '');
    const selectedAsset = initialAssets.find(a => a.id === selectedAssetId);

    // Derived asset ID usage for hooks
    const assetId = selectedAssetId;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const [data, setData] = useState<Candle[]>([]);
    const [loading, setLoading] = useState(true);

    // SMA Toggles
    const [showSMA10, setShowSMA10] = useState(false);
    const [showSMA20, setShowSMA20] = useState(false);
    const [showSMA50, setShowSMA50] = useState(false);
    const [showSMA100, setShowSMA100] = useState(false);

    // Order Form
    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
    const [quantity, setQuantity] = useState<number>(0);
    const [impact, setImpact] = useState<{ impact: number; estimatedTotal: number; fee: number } | null>(null);
    const [impactLoading, setImpactLoading] = useState(false);

    // Initialize Data
    useEffect(() => {
        // In real app, fetch from API
        const mockData = generateData(200);
        setData(mockData);
        setLoading(false);
    }, [assetId]);

    // Memoize SMA Calculations
    // This ensures we don't re-calculate on every render, only when data changes
    const sma10 = useMemo(() => calculateSMA(data, 10), [data]);
    const sma20 = useMemo(() => calculateSMA(data, 20), [data]);
    const sma50 = useMemo(() => calculateSMA(data, 50), [data]);
    const sma100 = useMemo(() => calculateSMA(data, 100), [data]);

    // Chart Rendering
    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#1f2937' }, // Dark mode bg
                textColor: '#d1d5db',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#374151' },
                horzLines: { color: '#374151' },
            }
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });
        candlestickSeries.setData(data);
        candlestickSeriesRef.current = candlestickSeries;

        // SMA Lines
        const sma10Series = chart.addSeries(LineSeries, { color: 'yellow', lineWidth: 1, title: 'SMA 10' });
        const sma20Series = chart.addSeries(LineSeries, { color: 'orange', lineWidth: 1, title: 'SMA 20' });
        const sma50Series = chart.addSeries(LineSeries, { color: 'blue', lineWidth: 1, title: 'SMA 50' });
        const sma100Series = chart.addSeries(LineSeries, { color: 'purple', lineWidth: 1, title: 'SMA 100' });

        if (showSMA10) sma10Series.setData(sma10);
        if (showSMA20) sma20Series.setData(sma20);
        if (showSMA50) sma50Series.setData(sma50);
        if (showSMA100) sma100Series.setData(sma100);

        chart.timeScale().fitContent();
        chartRef.current = chart;

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
    }, [data, showSMA10, showSMA20, showSMA50, showSMA100, sma10, sma20, sma50, sma100]); // Re-render if toggles change

    // Debounced Price Impact
    useEffect(() => {
        if (quantity <= 0) {
            setImpact(null);
            return;
        }

        const handler = setTimeout(async () => {
            setImpactLoading(true);
            try {
                // Validate locally first
                const parse = orderSchema.safeParse({ quantity });
                if (!parse.success) return;

                const res = await fetch('/api/price-impact', {
                    method: 'POST',
                    body: JSON.stringify({ assetId, amount: quantity, isBuy: orderType === 'BUY' })
                });
                const json = await res.json();
                if (res.ok) {
                    setImpact(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setImpactLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [quantity, orderType, assetId]);

    const handleOrderSubmit = async () => {
        if (quantity <= 0) return;
        // Call /api/trade
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                body: JSON.stringify({
                    userId: 'demo-user-1', // Mock user
                    assetId,
                    type: orderType,
                    quantity
                })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Trade Successful: ${json.message}`);
                // Refresh data...
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Trade failed');
        }
    };

    return (
        <div className="p-4 bg-gray-900 text-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                    OxNet Trading Terminal
                </h1>
                <div className="flex gap-4">
                    <select
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {initialAssets.map(asset => (
                            <option key={asset.id} value={asset.id}>
                                {asset.symbol} ({asset.type}) - ${asset.basePrice}
                            </option>
                        ))}
                    </select>
                    <a href="/login" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                        Switch Role
                    </a>
                </div>
            </div>

            {/* Asset Info Header */}
            {selectedAsset && (
                <div className="mb-4 text-xl font-mono text-gray-300">
                    Trading: <span className="font-bold text-white">{selectedAsset.symbol}</span>
                    <span className="text-sm text-gray-500 ml-2">Base: ${selectedAsset.basePrice}</span>
                </div>
            )}

            {/* Chart Section */}
            <div className="mb-4 bg-gray-800 p-4 rounded-lg shadow-lg">
                <div ref={chartContainerRef} className="w-full h-96" />
                <div className="mt-4 flex gap-4">
                    <label><input type="checkbox" checked={showSMA10} onChange={e => setShowSMA10(e.target.checked)} /> SMA 10</label>
                    <label><input type="checkbox" checked={showSMA20} onChange={e => setShowSMA20(e.target.checked)} /> SMA 20</label>
                    <label><input type="checkbox" checked={showSMA50} onChange={e => setShowSMA50(e.target.checked)} /> SMA 50</label>
                    <label><input type="checkbox" checked={showSMA100} onChange={e => setShowSMA100(e.target.checked)} /> SMA 100</label>
                </div>
            </div>

            {/* Order Form */}
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
                <h2 className="text-xl mb-4 font-semibold">Place Order</h2>
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setOrderType('BUY')}
                        className={`flex-1 py-2 rounded font-bold ${orderType === 'BUY' ? 'bg-green-600' : 'bg-gray-700'}`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setOrderType('SELL')}
                        className={`flex-1 py-2 rounded font-bold ${orderType === 'SELL' ? 'bg-red-600' : 'bg-gray-700'}`}
                    >
                        Sell
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 text-sm text-gray-400">Quantity</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Trade Preview */}
                <div className="mb-4 p-3 bg-gray-900 rounded text-sm text-gray-300">
                    {impactLoading ? (
                        <div>Calculating...</div>
                    ) : impact ? (
                        <>
                            <div className="flex justify-between">
                                <span>Price Impact:</span>
                                <span className={impact.impact > 1 ? 'text-red-500' : 'text-green-500'}>
                                    {impact.impact.toFixed(4)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Est. Fee (0.5%):</span>
                                <span>{impact.fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-white mt-1">
                                <span>Total Est. Cost:</span>
                                <span>{impact.estimatedTotal.toFixed(2)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-gray-500 text-center">Enter quantity to see preview</div>
                    )}
                </div>

                <button
                    onClick={handleOrderSubmit}
                    disabled={quantity <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Execute {orderType} Order
                </button>
            </div>
        </div>
    );
}
