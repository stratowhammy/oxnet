"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    auctionId: string;
    minRequiredBid: number;
    userId: string;
    userDelta: number;
}

export default function GoalsClientModule({ auctionId, minRequiredBid, userId, userDelta }: Props) {
    const router = useRouter();
    const [bid, setBid] = useState<number>(minRequiredBid);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleBid = async () => {
        if (bid < minRequiredBid) {
            setError(`Bid must be at least Δ ${minRequiredBid.toLocaleString()}`);
            return;
        }
        if (bid > userDelta) {
            setError(`You only have Δ ${userDelta.toLocaleString()}`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auctions/bid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auctionId,
                    userId,
                    bidAmount: bid
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to place bid");
            } else {
                setBid(bid + 1); // Reset slightly higher natively
                router.refresh();
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {error && <div className="text-red-400 text-xs mb-3 font-semibold">{error}</div>}

            <div className="flex gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Δ</span>
                    <input
                        type="number"
                        min={minRequiredBid}
                        step="100"
                        value={bid}
                        onChange={(e) => setBid(Number(e.target.value))}
                        className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        disabled={loading}
                    />
                </div>
                <button
                    onClick={handleBid}
                    disabled={loading || bid < minRequiredBid}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-lg"
                >
                    {loading ? "..." : "Place Bid"}
                </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between">
                <span>Minimum Required: <span className="text-gray-300">Δ {minRequiredBid.toLocaleString()}</span></span>
                <span>Your Delta: <span className={userDelta < minRequiredBid ? "text-red-400" : "text-green-500"}>Δ {userDelta.toLocaleString()}</span></span>
            </div>
        </div>
    );
}
