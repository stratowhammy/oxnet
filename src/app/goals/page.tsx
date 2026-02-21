import prisma from "@/lib/db";
import { evaluateGoalStatus } from "@/lib/goals";
import GoalsClientModule from "./GoalsClientModule";

export const dynamic = 'force-dynamic';

export default async function GoalsDashboard() {
    // Assuming 'demo-user-1' as the identity
    const userId = "demo-user-1";

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            userGoals: {
                include: { goalCard: true }
            }
        }
    });

    if (!user) {
        return <div className="p-8 text-white">User not found</div>;
    }

    // Evaluate live goals
    let totalEarnedVP = 0;
    let totalPotentialVP = 0;

    const evaluatedGoals = await Promise.all(user.userGoals.map(async (ug) => {
        const status = await evaluateGoalStatus(userId, ug.goalCardId);

        if (status === "EARNED") {
            totalEarnedVP += ug.goalCard.victoryPoints;
        } else {
            totalPotentialVP += ug.goalCard.victoryPoints;
        }

        return {
            ...ug,
            status
        };
    }));

    // Fetch active auctions
    const activeAuctions = await prisma.goalAuction.findMany({
        where: {
            isActive: true,
            endTime: { gt: new Date() }
        },
        include: {
            goalCard: true,
            highestBidder: true
        },
        orderBy: { endTime: 'asc' }
    });

    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-8">
            <header className="mb-10 flex justify-between items-end border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Victory Goals</h1>
                    <p className="text-gray-400">Manage your objective cards to secure graduation Victory Points.</p>
                </div>
                <div className="flex gap-4">
                    <a href="/" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm border border-gray-700 shadow-sm">
                        Back to Trading
                    </a>
                </div>
            </header>

            {/* Scoreboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-gradient-to-br from-green-900/40 to-green-900/10 border border-green-800 rounded-xl p-6 shadow-lg shadow-green-900/20">
                    <h2 className="text-green-500 font-bold uppercase tracking-widest text-sm mb-1">Earned Victory Points</h2>
                    <div className="text-5xl font-black text-green-400">{totalEarnedVP}</div>
                    <p className="text-green-600/80 text-sm mt-3 font-semibold">Criteria securely met and maintained.</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-900/10 border border-yellow-800 rounded-xl p-6 shadow-lg shadow-yellow-900/20">
                    <h2 className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-1">Potential Victory Points</h2>
                    <div className="text-5xl font-black text-yellow-500">{totalPotentialVP}</div>
                    <p className="text-yellow-600/80 text-sm mt-3 font-semibold">Criteria actively failing. Buy assets to satisfy bounds.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Active Goals (Left 8 Cols) */}
                <div className="xl:col-span-7">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2">My Active Goal Cards ({evaluatedGoals.length}/5)</h2>

                    {evaluatedGoals.length === 0 ? (
                        <div className="text-center p-12 bg-gray-900/50 border border-gray-800 rounded-xl border-dashed">
                            <p className="text-gray-500">You hold no active Goal Cards. Win an auction to begin earning VP.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {evaluatedGoals.map(goal => (
                                <div key={goal.id} className={`p-5 rounded-xl border flex justify-between items-center transition-all ${goal.status === 'EARNED'
                                        ? 'bg-green-950/20 border-green-800 shadow-[0_0_15px_rgba(22,163,74,0.1)]'
                                        : 'bg-gray-900 border-gray-700 opacity-80'
                                    }`}>
                                    <div className="flex-1 pr-6">
                                        <div className="flex gap-3 mb-2 items-center">
                                            <h3 className="font-bold text-lg text-white">{goal.goalCard.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded font-bold tracking-wider ${goal.status === 'EARNED' ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'}`}>
                                                {goal.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed mb-3">{goal.goalCard.description}</p>
                                        <p className="text-xs font-mono text-gray-500">Acquired at Cost: <span className="text-blue-400">Δ {goal.costPaid.toLocaleString()}</span></p>
                                    </div>
                                    <div className="text-right border-l border-gray-800/60 pl-6 py-2">
                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Provides</div>
                                        <div className={`text-4xl font-black ${goal.status === 'EARNED' ? 'text-green-500' : 'text-gray-500'}`}>
                                            {goal.goalCard.victoryPoints} <span className="text-xl font-bold">VP</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Live Auctions (Right 4 Cols) */}
                <div className="xl:col-span-5">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2 flex items-center justify-between">
                        Live Auctions
                        <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded tracking-wider animate-pulse">LIVE</span>
                    </h2>

                    {activeAuctions.length === 0 ? (
                        <div className="text-center p-12 bg-gray-900/50 border border-gray-800 rounded-xl border-dashed">
                            <p className="text-gray-500">No Goal Cards currently on the block. The Central Bank issues new cards every 4 hours.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {activeAuctions.map(auction => (
                                <div key={auction.id} className="bg-gray-900 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                                    <div className="p-5 border-b border-gray-800 bg-gray-800/30">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-white">{auction.goalCard.title}</h3>
                                            <span className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded font-bold">
                                                {auction.goalCard.victoryPoints} VP
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-snug">{auction.goalCard.description}</p>
                                    </div>

                                    <div className="p-5 bg-gray-900/50 flex justify-between items-center text-sm font-mono border-b border-gray-800">
                                        <div>
                                            <div className="text-gray-500 mb-1">Closes At</div>
                                            <div className="text-gray-300">{new Date(auction.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-500 mb-1">Highest Bid</div>
                                            <div className="text-blue-400 font-bold text-lg">Δ {auction.highestBid.toLocaleString()}</div>
                                            {auction.highestBidderId === userId && (
                                                <div className="text-green-500 text-xs mt-1">You hold the lead</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Client Component for Input logic */}
                                    <div className="p-5">
                                        <GoalsClientModule
                                            auctionId={auction.id}
                                            minRequiredBid={Math.max(auction.minBid, auction.highestBid + 1)}
                                            userId={userId}
                                            userDelta={user.deltaBalance}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
