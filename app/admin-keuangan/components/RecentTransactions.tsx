'use client';
import { useState, useEffect } from 'react';

interface Transaction {
    id: string;
    nama?: string;
    memberName?: string;
    jumlah: number;
    metode_pembayaran?: string;
    tanggal?: string;
    created_at?: string;
    status: string;
    type: 'member' | 'daily_pass';
    paket?: string;
    jenis?: string;
}

interface RecentTransactionsProps {
    preview?: boolean;
    limit?: number;
}

export default function RecentTransactions({ preview = false, limit = 10 }: RecentTransactionsProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRecentTransactions();

        // Refresh every 60 seconds
        const interval = setInterval(loadRecentTransactions, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadRecentTransactions = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/admin/recent-transactions?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setTransactions(data.data || []);
            } else {
                throw new Error(data.error || 'Failed to load data');
            }
        } catch (error) {
            console.error('❌ Error loading recent transactions:', error);
            setError(error instanceof Error ? error.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    };

    if (loading && transactions.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Transaksi Terbaru</h2>
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            </div>
        );
    }

    if (error && transactions.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Transaksi Terbaru</h2>
                <div className="text-center text-red-600 py-8">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p>{error}</p>
                    <button
                        onClick={loadRecentTransactions}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    if (preview) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Transaksi Terbaru</h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={loadRecentTransactions}
                            className="p-1 text-gray-500 hover:text-gray-700 transition"
                            title="Refresh data"
                        >
                            🔄
                        </button>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {transactions.length} transaksi
                        </span>
                    </div>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="font-medium">Belum ada transaksi</p>
                        <p className="text-sm mt-1">Transaksi terbaru akan muncul di sini</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.slice(0, 5).map((tx) => (
                            <div
                                key={tx.id}
                                className={`flex justify-between items-center p-3 rounded-lg border hover:shadow-sm transition-all ${tx.type === 'member'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-green-50 border-green-200'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'member' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}>
                                        <span className="text-white text-lg">
                                            {tx.type === 'member' ? '💳' : '🎫'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {tx.nama || tx.memberName || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {tx.type === 'member' ? (tx.paket || tx.jenis || 'Membership') : 'Daily Pass'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${tx.type === 'member' ? 'text-blue-600' : 'text-green-600'}`}>
                                        {formatCurrency(tx.jumlah)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {tx.metode_pembayaran || 'cash'}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {transactions.length > 5 && (
                            <button
                                onClick={() => window.location.href = '/admin-keuangan?tab=payments'}
                                className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 flex items-center justify-center space-x-1"
                            >
                                <span>Lihat semua transaksi</span>
                                <span>→</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Daftar Transaksi</h2>
                    <p className="text-gray-600 mt-1">Transaksi yang telah selesai</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={loadRecentTransactions}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2 transition-colors"
                    >
                        <span>🔄</span>
                        <span>Refresh</span>
                    </button>
                    <span className="bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                        {transactions.length} transaksi
                    </span>
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-lg font-medium">Belum ada transaksi</p>
                    <p className="text-sm mt-2">Transaksi akan muncul setelah ada pembayaran</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Tipe</th>
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Nama</th>
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Jumlah</th>
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Metode</th>
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Tanggal</th>
                                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'member'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {tx.type === 'member' ? '💳 Member' : '🎫 Daily Pass'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                {tx.nama || tx.memberName || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {tx.paket || tx.jenis || '-'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className={`py-3 px-4 font-bold ${tx.type === 'member' ? 'text-blue-600' : 'text-green-600'
                                        }`}>
                                        {formatCurrency(tx.jumlah)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="capitalize bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                                            {tx.metode_pembayaran || 'cash'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {formatDate(tx.tanggal || tx.created_at)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            ✓ Selesai
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary Info */}
            {transactions.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="font-bold text-gray-700">{transactions.length}</div>
                            <div className="text-gray-600">Total Transaksi</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-blue-600">
                                {transactions.filter(t => t.type === 'member').length}
                            </div>
                            <div className="text-gray-600">💳 Member</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-green-600">
                                {transactions.filter(t => t.type === 'daily_pass').length}
                            </div>
                            <div className="text-gray-600">🎫 Daily Pass</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-purple-600">
                                {formatCurrency(transactions.reduce((sum, t) => sum + (t.jumlah || 0), 0))}
                            </div>
                            <div className="text-gray-600">Total Nilai</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
