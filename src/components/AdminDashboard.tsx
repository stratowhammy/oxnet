'use client';

import React, { useEffect, useState } from 'react';

// Types
interface Portfolio {
    assetId: string;
    quantity: number;
    averageEntryPrice: number;
    isShortPosition: boolean;
}

interface User {
    id: string;
    deltaBalance: number;
    marginLimit: number;
    portfolios: Portfolio[];
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    useEffect(() => {
        // In real app, fetch from /api/admin/users
        // Mocking response for now to demonstrate UI
        const mockUsers: User[] = [
            {
                id: 'student-1',
                deltaBalance: 105000,
                marginLimit: 0,
                portfolios: [
                    { assetId: 'btc', quantity: 0.5, averageEntryPrice: 50000, isShortPosition: false },
                    { assetId: 'tesla', quantity: 10, averageEntryPrice: 200, isShortPosition: true }
                ]
            },
            {
                id: 'student-2',
                deltaBalance: 98000,
                marginLimit: 0,
                portfolios: []
            }
        ];
        setUsers(mockUsers);
        setLoading(false);
    }, []);

    if (loading) return <div>Loading Admin Dashboard...</div>;

    return (
        <div className="p-6 bg-gray-100 min-h-screen text-gray-900">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delta Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <React.Fragment key={user.id}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.deltaBalance.toLocaleString()} Δ</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Healthy
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button
                                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            {expandedUser === user.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </td>
                                </tr>
                                {expandedUser === user.id && (
                                    <tr className="bg-gray-50">
                                        <td colSpan={4} className="px-6 py-4">
                                            <h4 className="text-sm font-bold text-gray-700 mb-2">Portfolio Positions</h4>
                                            {user.portfolios.length > 0 ? (
                                                <ul className="list-disc list-inside text-sm text-gray-600">
                                                    {user.portfolios.map((p, idx) => (
                                                        <li key={idx}>
                                                            {p.isShortPosition ? <span className="text-red-500 font-bold">[SHORT]</span> : <span className="text-green-500 font-bold">[LONG]</span>}
                                                            {' '}Asset: {p.assetId} | Qty: {p.quantity} | Entry: {p.averageEntryPrice}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-gray-500">No active positions.</p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
