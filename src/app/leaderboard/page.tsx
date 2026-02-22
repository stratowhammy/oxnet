import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function Leaderboard() {
    const allUsers = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        include: {
            portfolios: {
                include: {
                    asset: true
                }
            }
        }
    });

    const STARTING_BALANCE = 100000;

    const leaderboardData = allUsers.map(user => {
        let unrealizedPNL = 0;
        let portfolioValue = 0;

        for (const p of user.portfolios) {
            const currentPrice = p.asset.basePrice;
            const costBasis = p.quantity * p.averageEntryPrice;
            const currentValue = p.quantity * currentPrice;

            if (p.isShortPosition) {
                unrealizedPNL += (costBasis - currentValue);
                portfolioValue -= currentValue; // Liability
            } else {
                unrealizedPNL += (currentValue - costBasis);
                portfolioValue += currentValue; // Asset
            }
        }

        const totalEquity = user.deltaBalance - ((user as any).marginLoan || 0) + portfolioValue;
        const totalNetPNL = totalEquity - STARTING_BALANCE;
        const realizedPNL = totalNetPNL - unrealizedPNL;

        return {
            id: user.id,
            username: (user as any).username,
            totalNetPNL,
            realizedPNL,
            unrealizedPNL,
            totalEquity,
            winRateScore: totalNetPNL > 0 ? 1 : (totalNetPNL === 0 ? 0 : -1) // simple aesthetic flag
        };
    });

    // Sort by Total Net PNL strictly descending
    leaderboardData.sort((a, b) => b.totalNetPNL - a.totalNetPNL);

    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-8">
            <header className="mb-10 flex justify-between items-end border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">Global Leaderboard</h1>
                    <p className="text-gray-400">Live ranking of student exchange performance. Measure Realized cash flow versus Unrealized holding gains.</p>
                </div>
                <div className="flex gap-4">
                    <a href="/" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm border border-gray-700 shadow-sm">
                        Back to Trading
                    </a>
                </div>
            </header>

            <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-500 text-xs uppercase tracking-widest font-bold">
                            <th className="py-4 px-6 w-16 text-center">Rank</th>
                            <th className="py-4 px-6 text-white font-bold">Trader Identification</th>
                            <th className="py-4 px-6 text-right">Realized PNL</th>
                            <th className="py-4 px-6 text-right">Unrealized PNL</th>
                            <th className="py-4 px-6 text-right">Total Net PNL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono">
                        {leaderboardData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-500">No trading data available.</td>
                            </tr>
                        ) : (
                            leaderboardData.map((user, index) => {
                                const rank = index + 1;
                                // Gold, Silver, Bronze for top 3
                                let rankColor = "text-gray-400 font-bold text-lg";
                                if (rank === 1) rankColor = "text-yellow-400 font-black text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
                                if (rank === 2) rankColor = "text-gray-300 font-bold text-xl";
                                if (rank === 3) rankColor = "text-orange-400 font-bold text-lg";

                                return (
                                    <tr key={user.id} className="hover:bg-gray-800/40 transition-colors group">
                                        <td className="py-5 px-6 text-center">
                                            <span className={rankColor}>#{rank}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex flex-col justify-center items-center shadow-inner font-bold text-white text-sm uppercase ring-1 ring-gray-700">
                                                    {(user.username || user.id).substring(0, 2)}
                                                </div>
                                                <div className="font-sans font-bold text-gray-200">
                                                    {user.username || user.id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`py-5 px-6 text-right font-bold tracking-tight ${user.realizedPNL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {user.realizedPNL >= 0 ? '+' : ''}Δ {user.realizedPNL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-5 px-6 text-right font-bold tracking-tight ${user.unrealizedPNL >= 0 ? 'text-blue-400' : 'text-purple-400'}`}>
                                            {user.unrealizedPNL >= 0 ? '+' : ''}Δ {user.unrealizedPNL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-5 px-6 text-right text-lg font-black tracking-tighter ${user.totalNetPNL >= 0 ? 'text-green-400' : 'text-red-400'} drop-shadow-md`}>
                                            {user.totalNetPNL >= 0 ? '▲' : '▼'} {Math.abs(user.totalNetPNL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto opacity-70">
                <div className="flex bg-gray-900 border border-gray-800 p-3 rounded items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></span>
                    <span className="text-gray-300">Profitable Net PNL</span>
                </div>
                <div className="flex bg-gray-900 border border-gray-800 p-3 rounded items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span>
                    <span className="text-gray-300">Negative Net PNL</span>
                </div>
                <div className="flex bg-gray-900 border border-gray-800 p-3 rounded items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0"></span>
                    <span className="text-gray-300">Positive Unrealized (Assets Appreciating)</span>
                </div>
                <div className="flex bg-gray-900 border border-gray-800 p-3 rounded items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full bg-purple-400 flex-shrink-0"></span>
                    <span className="text-gray-300">Negative Unrealized (Assets Depreciating)</span>
                </div>
            </div>
        </main>
    );
}
