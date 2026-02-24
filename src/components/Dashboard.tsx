'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createChart, ColorType, ISeriesApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { calculateSMA, calculateBollingerBands, Candle, BollingerBands } from '@/lib/indicators';
import { z } from 'zod';
import Banking from './Banking';

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
    portfolios?: { quantity: number }[];
};

type PortfolioItem = {
    assetId: string;
    quantity: number;
    averageEntryPrice: number;
    isShortPosition: boolean;
    leverage: number;
    liquidationPrice: number | null;
    asset: Asset;
};

type User = {
    id: string;
    username?: string | null;
    role?: string;
    playerRole?: string;
    hedgeFundBalance?: number;
    deltaBalance: number;
    marginLoan: number;
    lendingLimit?: number;
    lendingRate?: number;
    frozen?: boolean;
    portfolios: PortfolioItem[];
};

type NewsStory = {
    id: string;
    headline: string;
    context: string;
    targetSector: string;
    targetSpecialty: string;
    impactScope: string;
    direction: string;
    intensityWeight: number;
    publishedAt: Date | null;
};

// --- Mock Data Generator (moved from TradingInterface) ---
function generateData(count: number, currentBasePrice: number): Candle[] {
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    // Start count days back
    date.setDate(date.getDate() - count);

    // Instead of random walking forward from the start price, we want the *final* price to exactly match currentBasePrice.
    // Meaning we can randomly generate the diffs, and then normalize the whole array.
    const rawWalk = [100]; // Start at arbitrary value
    for (let i = 1; i < count; i++) {
        // Simple random walk
        const step = (Math.random() - 0.5) * 5;
        rawWalk.push(rawWalk[i - 1] + step);
    }

    // Scale the walk so the last value matches currentBasePrice
    const finalRawValue = rawWalk[count - 1];

    // If somehow the final raw value is 0 or negative (rare but possible), shift it up
    let minWalk = Math.min(...rawWalk);
    let shiftAmount = minWalk <= 0 ? Math.abs(minWalk) + 1 : 0;

    const scaledWalk = rawWalk.map(val => {
        const shifted = val + shiftAmount;
        return shifted * (currentBasePrice / (finalRawValue + shiftAmount));
    });

    const result: Candle[] = [];
    for (let i = 0; i < count; i++) {
        const base = scaledWalk[i];
        const volatility = base * 0.02; // 2% wick dispersion

        let open, close;
        if (i === 0) {
            open = base;
            close = base + (Math.random() - 0.5) * volatility;
        } else {
            open = result[i - 1].close;
            close = base;
        }

        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;

        const time = date.toISOString().split('T')[0];
        result.push({ time, open, high, low, close });
        date.setDate(date.getDate() + 1);
    }

    return result;
}

const orderSchema = z.object({
    quantity: z.number().positive(),
});

// ===== SECTOR INDEX VIEW COMPONENT =====
function SectorIndexView({ selectedSector, sectorAssets, sectorIndexData, onSelectAsset, onSelectSector, uniqueSectors, allAssets }: {
    selectedSector: string | null;
    sectorAssets: any[];
    sectorIndexData: any[];
    onSelectAsset: (id: string) => void;
    onSelectSector: (sector: string) => void;
    uniqueSectors: string[];
    allAssets: any[];
}) {
    const sectorChartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectorChartRef.current || sectorIndexData.length === 0) return;

        const chart = createChart(sectorChartRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#111827' },
                textColor: '#d1d5db',
            },
            width: sectorChartRef.current.clientWidth,
            height: 350,
            grid: {
                vertLines: { color: '#374151' },
                horzLines: { color: '#374151' },
            },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
        });

        const lineSeries = chart.addSeries(LineSeries, {
            color: '#22c55e',
            lineWidth: 2,
            title: `${selectedSector} Index`,
        });

        lineSeries.setData(sectorIndexData.map(d => ({ time: d.time as any, value: d.close })));
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (sectorChartRef.current) chart.applyOptions({ width: sectorChartRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [sectorIndexData, selectedSector]);

    if (!selectedSector) {
        // Overview: all sectors as cards
        return (
            <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-2xl font-black text-white mb-2">Market Sectors</h2>
                <p className="text-gray-400 text-sm mb-6">Select a sector to view its price-weighted performance index.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {uniqueSectors.map(sector => {
                        const companies = allAssets.filter(a => a.sector === sector);
                        const avgPrice = companies.reduce((acc: number, a: any) => acc + a.basePrice, 0) / companies.length;
                        const totalMktCap = companies.reduce((acc: number, a: any) => acc + (a.basePrice * a.supplyPool), 0);
                        return (
                            <div
                                key={sector}
                                onClick={() => onSelectSector(sector)}
                                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-green-700 hover:bg-gray-800/50 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-black text-white text-lg group-hover:text-green-400 transition-colors">{sector}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{companies.length} listed companies</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-400 font-mono font-bold text-lg">Δ {avgPrice.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">avg price</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {companies.slice(0, 5).map((c: any) => (
                                        <span key={c.id} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded font-mono">{c.symbol}</span>
                                    ))}
                                    {companies.length > 5 && (
                                        <span className="text-xs text-gray-600">+{companies.length - 5} more</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Detail: selected sector's chart + company table
    const startPrice = sectorIndexData[0]?.close ?? 0;
    const endPrice = sectorIndexData[sectorIndexData.length - 1]?.close ?? 0;
    const indexChange = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
    const isPositive = indexChange >= 0;

    return (
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => onSelectSector(null as any)}
                    className="text-green-400 text-xs font-bold uppercase hover:text-white mb-3 flex items-center gap-1"
                >
                    &larr; All Sectors
                </button>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white">{selectedSector}</h2>
                        <p className="text-gray-400 text-sm mt-1">{sectorAssets.length} companies · Price-Weighted Sector Index</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-mono font-black text-white">Δ {endPrice.toFixed(2)}</div>
                        <div className={`text-sm font-bold mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '▲' : '▼'} {Math.abs(indexChange).toFixed(2)}% overall
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="font-semibold text-gray-300 mb-3 px-1">Index Performance</h3>
                {sectorIndexData.length > 0 ? (
                    <div ref={sectorChartRef} className="w-full" />
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-600 text-sm">
                        No historical data — prices will appear once the engine runs.
                    </div>
                )}
            </div>

            {/* Companies Grid */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold text-gray-300 mb-4">Companies in this Sector</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sectorAssets.map((asset: any) => (
                        <div
                            key={asset.id}
                            onClick={() => onSelectAsset(asset.id)}
                            className="flex justify-between items-center p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-600 hover:bg-gray-700/50 transition-all group"
                        >
                            <div>
                                <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{asset.symbol}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[140px]">{asset.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-green-400 font-bold">Δ {asset.basePrice.toFixed(2)}</div>
                                <div className="text-xs text-gray-600">{asset.niche}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// @ts-ignore
export default function Dashboard({ initialUser, initialAssets, initialNews, allUsers = [] }: { initialUser: User, initialAssets: Asset[], initialNews: NewsStory[], allUsers?: any[] }) {
    // --- State: Layout & Selection ---
    const [selectedAssetId, setSelectedAssetId] = useState<string>(initialAssets[0]?.id || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('All');
    const [selectedNews, setSelectedNews] = useState<NewsStory | null>(null);
    const [showGlobalPortfolio, setShowGlobalPortfolio] = useState(false);
    const [showAssetDetails, setShowAssetDetails] = useState(false);
    const [activeTab, setActiveTab] = useState<'TRADE' | 'BANKING' | 'SECTORS'>('TRADE');
    const [selectedSector, setSelectedSector] = useState<string | null>(null);

    // --- State: Data ---
    const [user, setUser] = useState<User>(initialUser);
    const [assets, setAssets] = useState<Asset[]>(initialAssets);
    const [news, setNews] = useState<NewsStory[]>(initialNews);

    const router = useRouter();

    // Sync with fresh server props when router.refresh() triggers
    useEffect(() => {
        setUser(initialUser);
        setAssets(initialAssets);
        setNews(initialNews);
    }, [initialUser, initialAssets, initialNews]);

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

    // Unique sector list (excluding 'All')
    const uniqueSectors = useMemo(() => Array.from(new Set(assets.map(a => a.sector))).sort(), [assets]);

    // Assets belonging to the selected sector
    const sectorAssets = useMemo(() => {
        if (!selectedSector) return [];
        return assets.filter(a => a.sector === selectedSector);
    }, [assets, selectedSector]);

    // Aggregated price-weighted sector index candles from priceHistory
    const sectorIndexData = useMemo(() => {
        if (!selectedSector || sectorAssets.length === 0) return [];

        // Build a map of timestamp -> array of base prices
        const timeMap: Record<string, { open: number[], high: number[], low: number[], close: number[] }> = {};

        for (const asset of sectorAssets) {
            // @ts-ignore
            const history = asset.priceHistory || [];
            for (const ph of history) {
                const ts = new Date(ph.timestamp).toISOString().split('T')[0];
                if (!timeMap[ts]) timeMap[ts] = { open: [], high: [], low: [], close: [] };
                timeMap[ts].open.push(ph.open);
                timeMap[ts].high.push(ph.high);
                timeMap[ts].low.push(ph.low);
                timeMap[ts].close.push(ph.close);
            }
        }

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

        return Object.entries(timeMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, vals]) => ({
                time,
                open: avg(vals.open),
                high: avg(vals.high),
                low: avg(vals.low),
                close: avg(vals.close),
            }));
    }, [selectedSector, sectorAssets]);

    // --- State: Charting ---
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const visibleRangeRef = useRef<any>(null);
    const [chartData, setChartData] = useState<Candle[]>([]);

    // SMA Toggles
    const [showSMA10, setShowSMA10] = useState(false);
    const [showSMA20, setShowSMA20] = useState(false);
    const [showSMA50, setShowSMA50] = useState(false);
    const [showSMA100, setShowSMA100] = useState(false);
    const [showSMA200, setShowSMA200] = useState(false);

    // BB Toggles
    const [showBB, setShowBB] = useState(false);
    const [bbStdDev, setBbStdDev] = useState<number>(2);

    // --- State: Trading ---
    const [orderType, setOrderType] = useState<'BUY' | 'SELL' | 'SHORT'>('BUY');
    const [executionType, setExecutionType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [limitPrice, setLimitPrice] = useState<number | ''>('');
    const [quantity, setQuantity] = useState<number>(0);
    const [leverage, setLeverage] = useState<number>(1);
    const [impact, setImpact] = useState<{ impact: number; estimatedTotal: number; fee: number } | null>(null);
    const [impactLoading, setImpactLoading] = useState(false);
    const [takeProfitPrice, setTakeProfitPrice] = useState<number | ''>('');
    const [stopLossPrice, setStopLossPrice] = useState<number | ''>('');

    // --- Effects: Chart Data ---
    useEffect(() => {
        if (!selectedAsset) return;

        let data: Candle[] = [];

        // If the asset has actual price history, we map it into 15m intervals ideally
        // Since we are mocking the chart, we can map the 15m price records here.
        // @ts-ignore
        if (selectedAsset.priceHistory && selectedAsset.priceHistory.length > 0) {
            // @ts-ignore
            data = selectedAsset.priceHistory.map(ph => {
                return {
                    time: new Date(ph.timestamp).getTime() / 1000 as import('lightweight-charts').Time,
                    open: ph.open,
                    high: ph.high,
                    low: ph.low,
                    close: ph.close
                };
            });

            // Adjust the very last candle to match the current live basePrice
            if (data.length > 0) {
                const lastCandle = data[data.length - 1];
                lastCandle.close = selectedAsset.basePrice;
                if (selectedAsset.basePrice > lastCandle.high) {
                    lastCandle.high = selectedAsset.basePrice;
                }
                if (selectedAsset.basePrice < lastCandle.low) {
                    lastCandle.low = selectedAsset.basePrice;
                }
            }
        } else {
            data = generateData(200, selectedAsset.basePrice);
        }

        setChartData(data);
        visibleRangeRef.current = null; // Reset zoom when changing assets
    }, [selectedAsset]);

    // --- Effects: Chart Rendering ---
    const sma10 = useMemo(() => calculateSMA(chartData, 10), [chartData]);
    const sma20 = useMemo(() => calculateSMA(chartData, 20), [chartData]);
    const sma50 = useMemo(() => calculateSMA(chartData, 50), [chartData]);
    const sma100 = useMemo(() => calculateSMA(chartData, 100), [chartData]);
    const sma200 = useMemo(() => calculateSMA(chartData, 200), [chartData]);

    // Default to 20 period for BB
    const bollingerData = useMemo(() => showBB ? calculateBollingerBands(chartData, 20, bbStdDev) : [], [chartData, showBB, bbStdDev]);

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
        const sma100Series = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, title: 'SMA 100' });
        const sma200Series = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: 'SMA 200' });

        const bbUpperSeries = chart.addSeries(LineSeries, { color: '#e5e7eb', lineWidth: 1, lineStyle: 2, title: `BB Upper (${bbStdDev})` });
        const bbLowerSeries = chart.addSeries(LineSeries, { color: '#e5e7eb', lineWidth: 1, lineStyle: 2, title: `BB Lower (${bbStdDev})` });
        const bbMiddleSeries = chart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, title: `BB Mid` });

        if (showSMA10) sma10Series.setData(sma10);
        if (showSMA20) sma20Series.setData(sma20);
        if (showSMA50) sma50Series.setData(sma50);
        if (showSMA100) sma100Series.setData(sma100);
        if (showSMA200) sma200Series.setData(sma200);

        if (showBB && bollingerData.length > 0) {
            bbUpperSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.upper })));
            bbMiddleSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.middle })));
            bbLowerSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.lower })));
        }

        if (visibleRangeRef.current) {
            try {
                chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
            } catch (e) {
                console.warn("Failed to restore chart range", e);
            }
        } else if (chartData.length > 0) {
            // Default view: Last 100 candles
            const lastIndex = chartData.length - 1;
            chart.timeScale().setVisibleLogicalRange({
                from: lastIndex - 100,
                to: lastIndex,
            });
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        // Listen for user zoom/scroll and update the ref immediately
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) visibleRangeRef.current = range;
        });

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [chartData, showSMA10, showSMA20, showSMA50, showSMA100, showSMA200, sma10, sma20, sma50, sma100, sma200, showBB, bollingerData, bbStdDev]);

    // --- Content Parser: News Interactivity ---
    const renderClickableContent = (content: string) => {
        if (!content) return null;

        // Pattern for $SYMBOL (e.g., $P-NEX) or common company name patterns
        // We iterate through all assets to find matches for symbols or names
        const parts: (string | React.ReactNode)[] = [content];

        assets.forEach(asset => {
            const symbolPattern = new RegExp(`\\$${asset.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
            const namePattern = new RegExp(`\\b${asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

            for (let i = 0; i < parts.length; i++) {
                if (typeof parts[i] !== 'string') continue;
                const text = parts[i] as string;

                const symbolMatch = text.match(symbolPattern);
                const nameMatch = text.match(namePattern);

                if (symbolMatch || nameMatch) {
                    const pattern = symbolMatch ? symbolPattern : namePattern;
                    const subParts = text.split(pattern);
                    const newParts: (string | React.ReactNode)[] = [];

                    subParts.forEach((part, index) => {
                        newParts.push(part);
                        if (index < subParts.length - 1) {
                            newParts.push(
                                <button
                                    key={`${asset.id}-${i}-${index}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAssetId(asset.id);
                                        setActiveTab('TRADE');
                                        setSelectedNews(null);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 font-bold underline decoration-blue-400/30 hover:decoration-blue-300 transition-all px-1 rounded hover:bg-blue-400/10"
                                >
                                    {symbolMatch ? `$${asset.symbol}` : asset.name}
                                </button>
                            );
                        }
                    });

                    parts.splice(i, 1, ...newParts);
                    i += newParts.length - 1;
                }
            }
        });

        return parts;
    };

    // --- Effects: Price Impact ---
    useEffect(() => {
        if (quantity <= 0 || !selectedAsset || executionType === 'LIMIT') {
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
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const handleOrderSubmit = async () => {
        if (quantity <= 0 || !selectedAsset) return;
        try {
            const apiEndpoint = executionType === 'LIMIT' ? '/api/trade/limit' : '/api/trade';
            const reqBody = {
                userId: user.id,
                assetId: selectedAsset.id,
                type: orderType,
                quantity,
                leverage,
                takeProfitPrice: takeProfitPrice === '' ? undefined : takeProfitPrice,
                stopLossPrice: stopLossPrice === '' ? undefined : stopLossPrice,
                limitPrice: executionType === 'LIMIT' && limitPrice !== '' ? limitPrice : undefined
            };

            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });
            const json = await res.json();
            if (res.ok) {
                alert(`${executionType === 'LIMIT' ? 'Limit Order Placed' : 'Trade Successful'}: ${json.message}`);
                router.refresh(); // Optimistic server re-fetch without state wipe
                setQuantity(0);
                if (executionType === 'LIMIT') setLimitPrice('');
                setTakeProfitPrice('');
                setStopLossPrice('');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Trade failed');
        }
    };

    const handleClosePosition = async (assetId: string, quantity: number, isShort: boolean) => {
        if (!confirm(`Are you sure you want to close this position?`)) return;

        const closeType = isShort ? 'BUY' : 'SELL';

        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    assetId,
                    quantity,
                    type: closeType
                })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Position Closed: ${json.message}`);
                router.refresh();
            } else {
                alert(`Error closing position: ${json.error}`);
            }
        } catch (e) {
            alert('Failed to close position.');
        }
    };

    // --- Real Order Book Fetch ---
    const [orderBook, setOrderBook] = useState<{ bids: { price: number; size: number; total: number }[]; asks: { price: number; size: number; total: number }[] }>({ bids: [], asks: [] });

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const fetchOrderBook = async () => {
            if (!selectedAssetId) return;
            try {
                const res = await fetch(`/api/assets/${selectedAssetId}/orderbook`);
                if (res.ok) {
                    const data = await res.json();
                    setOrderBook(data);
                }
            } catch (e) {
                console.error('Failed to fetch order book', e);
            }
        };

        fetchOrderBook();
        interval = setInterval(fetchOrderBook, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [selectedAssetId]);

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-950 text-gray-100 font-sans overflow-y-auto lg:overflow-hidden">
            {/* --- Left Sidebar: Market Browser --- */}
            <aside className={`w-full lg:w-80 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-900 ${selectedAssetId && activeTab === 'TRADE' ? 'hidden lg:flex' : 'flex min-h-[50vh] lg:h-full'}`}>
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab('TRADE')}
                        className={`flex-1 py-3 font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === 'TRADE' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                    >
                        Market
                    </button>
                    <button
                        onClick={() => setActiveTab('SECTORS')}
                        className={`flex-1 py-3 font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === 'SECTORS' ? 'bg-gray-800 text-white border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                    >
                        Sectors
                    </button>
                    <button
                        onClick={() => setActiveTab('BANKING')}
                        className={`flex-1 py-3 font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === 'BANKING' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                    >
                        Banking
                    </button>
                </div>

                {activeTab === 'SECTORS' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white mb-1">Market Sectors</h2>
                            <p className="text-xs text-gray-500">View price-weighted sector indices</p>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {uniqueSectors.map(sector => {
                                const count = assets.filter(a => a.sector === sector).length;
                                const avgPrice = assets.filter(a => a.sector === sector).reduce((acc, a) => acc + a.basePrice, 0) / count;
                                return (
                                    <div
                                        key={sector}
                                        onClick={() => setSelectedSector(sector)}
                                        className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${selectedSector === sector ? 'bg-gray-800 border-l-4 border-l-green-500' : ''}`}
                                    >
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-white text-sm">{sector}</span>
                                            <span className="text-xs text-green-400 font-mono">Δ {avgPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{count} companies</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </aside>

            {/* --- Main Content --- */}
            <main className={`flex-1 flex flex-col min-w-0 min-h-0 relative ${!selectedAssetId && activeTab === 'TRADE' ? 'hidden lg:flex' : 'flex'}`}>

                {/* --- News Ticker --- */}
                {news.length > 0 && (
                    <div className="h-10 border-b border-gray-800 bg-black flex items-center overflow-hidden shrink-0">
                        <div className="bg-blue-600 text-white font-bold text-xs uppercase px-4 h-full flex items-center z-10 shrink-0 shadow-lg">
                            Live News
                        </div>
                        <div className="flex-1 overflow-hidden pl-4 flex items-center">
                            {/* Ribbon duplicating the news items to create an infinite ribbon without gaps */}
                            <div className="flex w-max flex-shrink-0 animate-ribbon">
                                {[...Array(4)].map((_, i) => (
                                    <React.Fragment key={`rbn-group-${i}`}>
                                        {news.slice(0, 20).map(n => (
                                            <span
                                                key={`rbn-${i}-${n.id}`}
                                                onClick={() => setSelectedNews(n)}
                                                className="text-gray-300 hover:text-white cursor-pointer mr-12 text-sm transition-colors whitespace-nowrap"
                                            >
                                                <span className={`mr-2 font-mono font-bold ${n.direction === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                                                    [{n.targetSector}]
                                                </span>
                                                {n.headline}
                                            </span>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header: Portfolio Summary */}
                <header className="bg-gray-900 border-b border-gray-800 p-4 flex flex-col lg:flex-row justify-between items-center shadow-lg gap-4">
                    <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 flex-shrink-0">
                                <img src="/logo.png" alt="Logo" className="object-contain w-full h-full drop-shadow-lg" />
                            </div>
                            <h1 className="text-xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Market Master Engine</h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6 w-full lg:w-auto">
                        <div className="text-sm font-mono text-gray-400">
                            <span className="uppercase text-xs mr-2 font-bold tracking-widest">Callsign:</span>
                            <span className="text-white bg-gray-800 px-3 py-1 rounded shadow-inner border border-gray-700">{user.username || user.id}</span>
                        </div>
                        <div className="flex bg-gray-800 p-1 rounded border border-gray-700">
                            <div className="px-4 py-1 flex items-center gap-2 border-r border-gray-700">
                                <span className="text-xs uppercase text-gray-400 font-bold tracking-widest">Delta</span>
                                <span className="font-mono text-green-400 font-bold tracking-tight text-lg">Δ {user.deltaBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {user.marginLoan > 0 && (
                                <div className="px-4 py-1 flex items-center gap-2">
                                    <span className="text-xs uppercase text-gray-500 font-bold tracking-widest">Margin Loan</span>
                                    <span className="font-mono text-red-500 tracking-tight">Δ {user.marginLoan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex bg-gray-800 p-1 rounded border border-gray-700 items-center justify-center">
                            <button
                                onClick={() => setShowGlobalPortfolio(true)}
                                className="text-xs hover:text-white text-gray-400 border-r border-gray-700 px-3 py-1 font-bold uppercase tracking-widest transition-colors"
                            >
                                Portfolio
                            </button>
                            <a href="/news" className="text-xs hover:text-white text-gray-400 border-r border-gray-700 px-3 py-1 font-bold uppercase tracking-widest transition-colors">
                                News
                            </a>
                            <a href="/goals" className="text-xs hover:text-white text-gray-400 border-r border-gray-700 px-3 py-1 font-bold uppercase tracking-widest transition-colors">
                                Goals
                            </a>
                            <a href="/leaderboard" className="text-xs hover:text-white text-gray-400 px-3 py-1 font-bold uppercase tracking-widest transition-colors">
                                Leaderboard
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            {user.role === 'ADMIN' && (
                                <a
                                    href="/admin"
                                    className="text-xs font-bold uppercase tracking-widest text-yellow-400 hover:text-white px-3 py-2 border border-yellow-900 hover:bg-yellow-900/50 rounded transition-all"
                                >
                                    ⚙ Admin
                                </a>
                            )}
                            <button
                                onClick={handleLogout}
                                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white px-3 py-2 border border-gray-700 hover:bg-gray-800 rounded transition-all"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                {activeTab === 'BANKING' ? (
                    <Banking user={user} allUsers={allUsers} />
                ) : activeTab === 'SECTORS' ? (
                    <SectorIndexView
                        selectedSector={selectedSector}
                        sectorAssets={sectorAssets}
                        sectorIndexData={sectorIndexData}
                        onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('TRADE'); }}
                        onSelectSector={setSelectedSector}
                        uniqueSectors={uniqueSectors}
                        allAssets={assets}
                    />
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 grid grid-cols-12 gap-4 lg:gap-6">
                        {/* Mobile Back Button */}
                        <div className="col-span-12 lg:hidden">
                            <button
                                onClick={() => setSelectedAssetId('')}
                                className="text-blue-400 font-bold uppercase text-xs hover:text-white flex items-center gap-2 px-2 py-1 bg-gray-800 rounded border border-gray-700"
                            >
                                &larr; Back to Market List
                            </button>
                        </div>

                        {selectedAsset ? (
                            <>
                                {/* Asset Header & Chart (Col 8) */}
                                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                                    {/* Active Positions Widget removed per user request */}

                                    {/* Main Chart Header */}
                                    <div
                                        className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-800 flex justify-between items-center cursor-pointer hover:bg-gray-800/80 transition-colors group relative overflow-hidden"
                                        onClick={() => setShowAssetDetails(true)}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h1 className="text-3xl font-black text-white">{selectedAsset.symbol}</h1>
                                                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded font-mono border border-gray-700">Click for Details</span>
                                            </div>
                                            <div className="text-gray-400 text-sm">{selectedAsset.name}</div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <div className="text-4xl font-mono font-black text-white tracking-tighter drop-shadow-md">
                                                <span className="text-gray-500 mr-1 text-2xl font-sans font-normal">Δ</span>
                                                {selectedAsset.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Chart Card */}
                                    <div className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800 flex-1 min-h-[450px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2 px-2">
                                            <h3 className="font-semibold text-gray-300">Price History</h3>
                                            <div className="flex gap-3 text-xs flex-wrap items-center">
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA10} onChange={e => setShowSMA10(e.target.checked)} className="accent-blue-500" /> SMA 10</label>
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA20} onChange={e => setShowSMA20(e.target.checked)} className="accent-blue-500" /> SMA 20</label>
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA50} onChange={e => setShowSMA50(e.target.checked)} className="accent-blue-500" /> SMA 50</label>
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA100} onChange={e => setShowSMA100(e.target.checked)} className="accent-blue-500" /> SMA 100</label>
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showSMA200} onChange={e => setShowSMA200(e.target.checked)} className="accent-blue-500" /> SMA 200</label>

                                                <div className="w-px h-4 bg-gray-700 mx-1"></div>

                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="accent-purple-500" /> Bollinger Bands</label>
                                                {showBB && (
                                                    <select
                                                        value={bbStdDev}
                                                        onChange={e => setBbStdDev(Number(e.target.value))}
                                                        className="bg-gray-800 border border-gray-700 rounded px-1 text-gray-300 focus:outline-none focus:border-purple-500"
                                                    >
                                                        <option value={1}>1σ</option>
                                                        <option value={2}>2σ</option>
                                                        <option value={3}>3σ</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                        <div ref={chartContainerRef} className="flex-1 w-full" />
                                    </div>

                                    {/* Order Book Panel */}
                                    <div className="bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-800 flex-1 min-h-[400px]">
                                        <h3 className="font-semibold text-gray-300 mb-4 px-2">Market Depth - Order Book</h3>
                                        <div className="grid grid-cols-2 gap-4 h-full pl-2 pr-2">
                                            {/* Bids */}
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 uppercase font-bold border-b border-gray-800 pb-2 mb-2">
                                                    <span>Bid Vol</span>
                                                    <span>Price</span>
                                                </div>
                                                <div className="space-y-1 h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {orderBook.bids.map((bid, i) => (
                                                        <div key={`bid-${i}`} className="flex justify-between text-sm hover:bg-gray-800 cursor-default px-1 rounded relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 bottom-0 bg-green-500/10 z-0 transition-all" style={{ width: `${Math.min(100, (bid.size / 500) * 100)}%` }}></div>
                                                            <span className="text-gray-400 z-10">{bid.size}</span>
                                                            <span className="text-green-500 font-mono z-10">{bid.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Asks */}
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 uppercase font-bold border-b border-gray-800 pb-2 mb-2">
                                                    <span>Price</span>
                                                    <span>Ask Vol</span>
                                                </div>
                                                <div className="space-y-1 h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {orderBook.asks.map((ask, i) => (
                                                        <div key={`ask-${i}`} className="flex justify-between text-sm hover:bg-gray-800 cursor-default px-1 rounded relative overflow-hidden group">
                                                            <div className="absolute top-0 left-0 bottom-0 bg-red-500/10 z-0 transition-all" style={{ width: `${Math.min(100, (ask.size / 500) * 100)}%` }}></div>
                                                            <span className="text-red-500 font-mono z-10">{ask.price.toFixed(2)}</span>
                                                            <span className="text-gray-400 z-10">{ask.size}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
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
                                            <button
                                                onClick={() => setOrderType('SHORT')}
                                                className={`flex-1 py-1.5 rounded text-sm font-semibold transition-all ${orderType === 'SHORT' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                            >
                                                Short
                                            </button>
                                        </div>

                                        {/* Execution Type (Market/Limit) */}
                                        <div className="flex gap-2 mb-4 bg-gray-950 p-1 border border-gray-800 rounded">
                                            <button
                                                onClick={() => setExecutionType('MARKET')}
                                                className={`flex-1 py-1 text-xs font-bold uppercase tracking-widest rounded ${executionType === 'MARKET' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Market
                                            </button>
                                            <button
                                                onClick={() => setExecutionType('LIMIT')}
                                                className={`flex-1 py-1 text-xs font-bold uppercase tracking-widest rounded ${executionType === 'LIMIT' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Limit
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                                                className="w-full bg-gray-950 border border-gray-700 text-white p-3 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono mb-4"
                                                placeholder="0.00"
                                            />

                                            {executionType === 'LIMIT' && (
                                                <div className="mb-4">
                                                    <label className="block text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1">Limit Price</label>
                                                    <input
                                                        type="number"
                                                        value={limitPrice}
                                                        onChange={(e) => setLimitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="w-full bg-gray-950 border border-yellow-700/50 text-white p-3 rounded focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all font-mono"
                                                        placeholder={`Target execution at e.g. ${(selectedAsset.basePrice * 0.98).toFixed(2)}`}
                                                    />
                                                </div>
                                            )}

                                            {/* Leverage Slider */}
                                            <div className="mb-2 mt-4 flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
                                                <span className="text-gray-500">Leverage</span>
                                                <span className="text-white font-mono">{leverage}x</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="10"
                                                value={leverage}
                                                onChange={e => setLeverage(parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />

                                            {/* Conditional Bounds */}
                                            <div className="grid grid-cols-2 gap-4 mt-6">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Take Profit</label>
                                                    <input
                                                        type="number"
                                                        value={takeProfitPrice}
                                                        onChange={(e) => setTakeProfitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="w-full bg-gray-950 border border-gray-700 text-white p-2 text-sm rounded focus:border-green-500 outline-none transition-all font-mono"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stop Loss</label>
                                                    <input
                                                        type="number"
                                                        value={stopLossPrice}
                                                        onChange={(e) => setStopLossPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                        className="w-full bg-gray-950 border border-gray-700 text-white p-2 text-sm rounded focus:border-red-500 outline-none transition-all font-mono"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-950 rounded p-4 mb-6 border border-gray-800">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-500">Price Impact</span>
                                                <span className={`font-mono ${impact?.impact && impact.impact > 1 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {executionType === 'LIMIT' ? 'LIMIT (0%)' : impactLoading ? '...' : impact ? `${impact.impact.toFixed(4)}%` : '--'}
                                                </span>
                                            </div>
                                            {leverage > 1 && quantity > 0 && (
                                                (() => {
                                                    let entryPrice = selectedAsset.basePrice;
                                                    if (impact && impact.estimatedTotal) {
                                                        entryPrice = (impact.estimatedTotal + impact.fee) / quantity;
                                                    }

                                                    let liqPrice = 0;
                                                    if (orderType === 'BUY') {
                                                        liqPrice = entryPrice - (entryPrice / leverage);
                                                    } else if (orderType === 'SHORT') {
                                                        liqPrice = entryPrice + (entryPrice / leverage);
                                                    }

                                                    const marginRequired = (entryPrice * quantity) / leverage;

                                                    return (
                                                        <>
                                                            {orderType !== 'SELL' && (
                                                                <div className="flex justify-between text-sm mb-2">
                                                                    <span className="text-blue-500 font-bold uppercase text-xs tracking-wider flex items-center">Margin Required</span>
                                                                    <span className="font-mono text-blue-400 font-bold">
                                                                        Δ {marginRequired.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-sm mb-2">
                                                                <span className="text-orange-500 font-bold uppercase text-xs tracking-wider flex items-center">Est. Liquidation</span>
                                                                <span className="font-mono text-orange-400 font-bold">
                                                                    Δ {Math.max(0, liqPrice).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()
                                            )}
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-500">Est. Fee (0.5%)</span>
                                                <span className="font-mono text-gray-300">
                                                    {executionType === 'LIMIT' && limitPrice !== '' ? `Δ ${((Number(limitPrice) * quantity) * 0.005).toFixed(2)}` : impactLoading ? '...' : impact ? `Δ ${impact.fee.toFixed(2)}` : '--'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold border-t border-gray-800 pt-2 mt-2">
                                                <span className="text-gray-300">Total</span>
                                                <span className="font-mono text-white text-lg">
                                                    {executionType === 'LIMIT' && limitPrice !== '' ? `Δ ${((Number(limitPrice) * quantity) * 1.005).toFixed(2)}` : impactLoading ? '...' : impact ? `Δ ${impact.estimatedTotal.toFixed(2)}` : '--'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleOrderSubmit}
                                            disabled={quantity <= 0 || (executionType === 'LIMIT' && limitPrice === '') || (executionType === 'MARKET' && impactLoading)}
                                            className={`w-full py-3 rounded font-bold text-white shadow-lg transition-all ${orderType === 'BUY' ? 'bg-green-600 hover:bg-green-500' : orderType === 'SELL' ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {executionType === 'LIMIT' ? 'Place Limit' : orderType} {selectedAsset.symbol}
                                        </button>
                                    </div>

                                    {/* Current Position Panel */}
                                    <div className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800 flex-1">
                                        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Your Position</h3>
                                        {(() => {
                                            const positions = user.portfolios.filter(p => p.assetId === selectedAsset.id);
                                            if (positions.length === 0) return <div className="text-gray-500 text-sm text-center py-4">No open position</div>;

                                            return (
                                                <div className="space-y-6">
                                                    {positions.map((position, i) => {
                                                        const marketValue = position.quantity * selectedAsset.basePrice; // approx
                                                        const pnl = position.isShortPosition
                                                            ? (position.averageEntryPrice - selectedAsset.basePrice) * position.quantity
                                                            : (selectedAsset.basePrice - position.averageEntryPrice) * position.quantity;
                                                        const isProfitable = pnl >= 0;

                                                        return (
                                                            <div key={i} className="bg-gray-800/50 p-4 rounded border border-gray-700">
                                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${position.isShortPosition ? 'bg-purple-900/50 text-purple-300' : 'bg-green-900/50 text-green-300'}`}>
                                                                        {position.isShortPosition ? 'SHORT' : 'LONG'}
                                                                    </span>
                                                                    <span className="text-gray-400 text-sm">
                                                                        {position.quantity} sh <span className="ml-2 px-1 py-0.5 bg-gray-700/50 rounded text-xs">{(position as any).leverage || 1}x</span>
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400 text-sm">Avg Entry</span>
                                                                        <span className="text-white font-mono">Δ {position.averageEntryPrice.toFixed(2)}</span>
                                                                    </div>
                                                                    {(position as any).liquidationPrice && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-orange-500/80 text-sm">Liquidation</span>
                                                                            <span className="text-orange-400 font-mono">Δ {(position as any).liquidationPrice.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between border-t border-gray-700/50 pt-2">
                                                                        <span className="text-gray-400 text-sm">Notional Value</span>
                                                                        <span className="text-white font-mono">Δ {marketValue.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400 text-sm">Unrealized PnL</span>
                                                                        <span className={`font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                                                            {isProfitable ? '+' : ''}{pnl.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="pt-2">
                                                                        <button
                                                                            onClick={() => handleClosePosition(selectedAsset.id, position.quantity, position.isShortPosition)}
                                                                            className="w-full text-xs font-bold py-1.5 rounded transition-colors bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-800/50"
                                                                        >
                                                                            Close Position
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
                )}
            </main>

            {/* --- Modals --- */}

            {/* News Overlay */}
            {selectedNews && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedNews(null)}>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-white">{selectedNews.headline}</h2>
                            <button onClick={() => setSelectedNews(null)} className="text-gray-500 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="text-gray-300 text-lg leading-relaxed mb-8">
                            {renderClickableContent(selectedNews.context)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-6">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target Sector</div>
                                <div className="text-white font-mono bg-gray-800 px-3 py-1 rounded inline-block">{selectedNews.targetSector}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Direction</div>
                                <div className={`font-bold font-mono ${selectedNews.direction === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                                    {selectedNews.direction}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Details Overlay */}
            {showAssetDetails && selectedAsset && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setShowAssetDetails(false)}>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 border-b border-gray-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-4xl font-black text-white tracking-tight">{selectedAsset.symbol}</h2>
                                        <span className="bg-blue-900/50 border border-blue-800 text-blue-300 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">{selectedAsset.sector}</span>
                                        <span className="bg-purple-900/50 border border-purple-800 text-purple-300 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">{selectedAsset.niche}</span>
                                    </div>
                                    <h3 className="text-xl text-gray-400 font-medium">{selectedAsset.name}</h3>
                                </div>
                                <button onClick={() => setShowAssetDetails(false)} className="text-gray-500 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            <p className="text-gray-300 text-lg leading-relaxed mb-8 border-l-4 border-gray-700 pl-4">
                                {selectedAsset.description}
                            </p>

                            <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-4 border-b border-gray-800 pb-2">Financial Overview</h4>

                            {(() => {
                                // Assuming Asset type includes 'portfolios' property, which is an array of user's positions for this asset.
                                // If 'portfolios' is not directly on Asset, this logic might need adjustment based on actual data structure.
                                const userLongs = selectedAsset.portfolios?.reduce((acc, p) => acc + p.quantity, 0) || 0;
                                const totalShares = selectedAsset.supplyPool + userLongs;
                                const marketCap = totalShares * selectedAsset.basePrice;

                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800/50">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Base Price</div>
                                            <div className="text-xl font-mono text-white">Δ {selectedAsset.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800/50">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outstanding Shares</div>
                                            <div className="text-xl font-mono text-blue-400">{totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div className="bg-gray-950 p-4 rounded-lg border border-gray-800/50">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">AMM Pool Depth</div>
                                            <div className="text-xl font-mono text-gray-400">{selectedAsset.supplyPool.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div className="bg-gray-950 p-4 rounded-lg border border-green-900/30 bg-gradient-to-tr from-green-900/10 to-transparent">
                                            <div className="text-xs text-green-500/70 font-bold uppercase tracking-wider mb-1">Market Capitalization</div>
                                            <div className="text-xl font-mono text-green-400 font-bold">Δ {marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Portfolio Overlay */}
            {showGlobalPortfolio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-5xl w-full h-[80vh] flex flex-col relative">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Global Portfolio</h2>
                            <button
                                onClick={() => setShowGlobalPortfolio(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {user.portfolios.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-500 text-lg">
                                    No active positions currently held.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase tracking-wider">
                                            <th className="pb-3 font-semibold">Asset</th>
                                            <th className="pb-3 font-semibold">Type</th>
                                            <th className="pb-3 font-semibold text-right">Quantity</th>
                                            <th className="pb-3 font-semibold text-right">Avg Entry</th>
                                            <th className="pb-3 font-semibold text-right">Current Price</th>
                                            <th className="pb-3 font-semibold text-right">Margin/Lev</th>
                                            <th className="pb-3 font-semibold text-right">Liq Price</th>
                                            <th className="pb-3 font-semibold text-right">Notional</th>
                                            <th className="pb-3 font-semibold text-right">Unrealized PnL</th>
                                            <th className="pb-3 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {user.portfolios.map((p, i) => {
                                            const asset = p.asset;
                                            const notional = p.quantity * asset.basePrice;
                                            const pnl = p.isShortPosition
                                                ? (p.averageEntryPrice - asset.basePrice) * p.quantity
                                                : (asset.basePrice - p.averageEntryPrice) * p.quantity;
                                            const isProfitable = pnl >= 0;

                                            return (
                                                <tr key={i} className="text-gray-300 hover:bg-gray-800/50 transition-colors">
                                                    <td className="py-4">
                                                        <div className="font-bold text-white">{asset.symbol}</div>
                                                        <div className="text-xs text-gray-500 truncate w-32">{asset.name}</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${p.isShortPosition ? 'bg-purple-900/50 text-purple-300' : 'bg-green-900/50 text-green-300'}`}>
                                                            {p.isShortPosition ? 'SHORT' : 'LONG'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-right font-mono">{p.quantity}</td>
                                                    <td className="py-4 text-right font-mono text-gray-400">Δ {p.averageEntryPrice.toFixed(2)}</td>
                                                    <td className="py-4 text-right font-mono">Δ {asset.basePrice.toFixed(2)}</td>
                                                    <td className="py-4 text-right">
                                                        <div className={`text-xs font-mono font-bold ${p.leverage > 1 ? 'text-orange-400' : 'text-gray-500'}`}>
                                                            {p.leverage.toFixed(2)}x
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right font-mono">
                                                        <div className={`text-xs ${p.liquidationPrice ? 'text-red-400' : 'text-gray-500'}`}>
                                                            {p.liquidationPrice ? `Δ ${p.liquidationPrice.toFixed(2)}` : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right font-mono text-white">Δ {notional.toFixed(2)}</td>
                                                    <td className={`py-4 text-right font-mono font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                                        {isProfitable ? '+' : ''}{pnl.toFixed(2)}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                handleClosePosition(asset.id, p.quantity, p.isShortPosition);
                                                                setShowGlobalPortfolio(false);
                                                            }}
                                                            className="text-xs font-bold py-1 px-3 rounded transition-colors bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-800/50"
                                                        >
                                                            Close
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes ticker {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
