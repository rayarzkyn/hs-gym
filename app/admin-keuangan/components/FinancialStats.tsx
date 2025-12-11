'use client';
import { useEffect, useState } from 'react';

interface FinancialStatsProps {
  data: any;
  detailed?: boolean;
  lastUpdate?: string;
  isRealTime?: boolean;
}

interface StatsData {
  summary?: {
    totalRevenue?: number;
    totalExpenses?: number;
    netProfit?: number;
    activeMembers?: number;
    pendingMembers?: number;
    activeNonMembers?: number;
    totalTransactions?: number;
    memberTransactions?: number;
    nonMemberTransactions?: number;
    todayRevenue?: number;
    monthlyRevenue?: number;
    membershipRevenue?: number;
  };
  revenue?: {
    total?: number;
    membership?: number;
    dailyPass?: number;
    monthlyDailyPass?: number;
    other?: number;
  };
  transactions?: {
    total?: number;
    membership?: number;
    dailyPass?: number;
    monthlyDailyPass?: number;
    date?: string;
  };
  members?: {
    active?: number;
    pending?: number;
    total?: number;
    recentPayments?: number;
  };
  debug?: any;
  lastUpdated?: string;
  isRealTime?: boolean;
}

// Helper functions di luar component
const calculateTrend = (current: number = 0, previous: number = current * 0.8) => {
  if (previous === 0) return { value: '+0%', trend: 'up' };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    trend: change >= 0 ? 'up' : 'down'
  };
};

const formatCurrency = (amount: number = 0) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FinancialStats({ data, detailed = false, lastUpdate, isRealTime = false }: FinancialStatsProps) {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (data) {
      setStatsData(data);
      setIsLoading(false);
      console.log('📊 FinancialStats received REAL-TIME data:', {
        revenue: data.summary?.totalRevenue,
        members: data.summary?.activeMembers,
        isRealTime: data.isRealTime
      });
    } else {
      setIsLoading(false);
    }
  }, [data]);

  // Early return untuk loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Jika tidak ada data
  if (!statsData || !statsData.summary) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-gray-500 text-lg mb-4">Data tidak tersedia</div>
        <div className="text-sm text-gray-400">Tunggu data dimuat atau refresh halaman</div>
      </div>
    );
  }

  // Data sudah divalidasi
  const summary = statsData.summary || {};
  const revenue = statsData.revenue || {};
  const transactions = statsData.transactions || {};
  const members = statsData.members || {};

  // Hitung trends dengan default values
  const revenueTrend = calculateTrend(summary.totalRevenue || 0);
  const expenseTrend = calculateTrend(summary.totalExpenses || 0);
  const profitTrend = calculateTrend(summary.netProfit || 0);
  const transactionTrend = calculateTrend(summary.totalTransactions || 0);

  const stats = [
    {
      title: 'Total Pendapatan',
      value: formatCurrency(summary.totalRevenue || 0),
      change: revenueTrend.value,
      trend: revenueTrend.trend,
      icon: '💰',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `Membership: ${formatCurrency(revenue.membership || 0)} • Daily Pass: ${formatCurrency(revenue.dailyPass || 0)}`
    },
    {
      title: 'Total Pengeluaran',
      value: formatCurrency(summary.totalExpenses || 0),
      change: expenseTrend.value,
      trend: expenseTrend.trend,
      icon: '📤',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: `Hari ini`
    },
    {
      title: 'Laba Bersih',
      value: formatCurrency(summary.netProfit || 0),
      change: profitTrend.value,
      trend: profitTrend.trend,
      icon: '📈',
      color: (summary.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: (summary.netProfit || 0) >= 0 ? 'bg-blue-50' : 'bg-red-50',
      description: `Revenue - Expenses`
    },
    {
      title: 'Total Transaksi',
      value: (summary.totalTransactions || 0).toString(),
      change: transactionTrend.value,
      trend: transactionTrend.trend,
      icon: '💳',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: `Member: ${transactions.membership || 0} • Daily Pass: ${transactions.dailyPass || 0}`
    }
  ];

  const detailedStats = [
    {
      title: 'Member Aktif',
      value: (members.active || 0).toString(),
      icon: '👥',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      revenue: formatCurrency(revenue.membership || 0),
      description: `Revenue membership`
    },
    {
      title: 'Member Pending',
      value: (members.pending || 0).toString(),
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Menunggu verifikasi'
    },
    {
      title: 'Daily Pass Hari Ini',
      value: (transactions.dailyPass || 0).toString(),
      icon: '🎫',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      revenue: formatCurrency(revenue.dailyPass || 0),
      description: `Transaksi hari ini`
    },
    {
      title: 'Monthly Daily Pass',
      value: (transactions.monthlyDailyPass || 0).toString(),
      icon: '📅',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      revenue: formatCurrency(revenue.monthlyDailyPass || 0),
      description: `Bulan ini`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header dengan real-time indicator */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
            {isRealTime && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Real-time
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {lastUpdate ? `Terakhir update: ${lastUpdate}` : 'Loading...'}
            {!isRealTime && (
              <span className="ml-2 text-yellow-600">
                ⚠️ Data cached
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Debug Info - hanya di development */}
      {process.env.NODE_ENV === 'development' && statsData.debug && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Debug Info:</h4>
          <div className="text-xs text-blue-700 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>Active Members: <strong>{statsData.debug.activeMembersCount}</strong></div>
            <div>Today Transactions: <strong>{statsData.debug.todayTransactionsCount}</strong></div>
            <div>Membership Revenue: <strong>{formatCurrency(statsData.debug.membershipRevenue)}</strong></div>
            <div>Daily Pass Revenue: <strong>{formatCurrency(statsData.debug.dailyPassRevenue)}</strong></div>
            <div>Query Time: <strong>{statsData.debug.queryTime}</strong></div>
            <div>Timestamp: <strong>{new Date(statsData.debug.timestamp).toLocaleTimeString()}</strong></div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className={`text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-gray-600 text-sm font-medium">{stat.title}</h3>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              {stat.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Stats (if enabled) */}
      {detailed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {detailedStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-600 text-sm">{stat.title}</h4>
                    <p className={`text-lg font-semibold ${stat.color}`}>
                      {stat.value}
                    </p>
                    {stat.revenue && (
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.revenue}
                      </p>
                    )}
                    {stat.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {stat.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detail Pendapatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-2xl mb-2">💳</div>
                <div className="text-sm text-gray-600 font-medium">Membership</div>
                <div className="text-xl font-bold text-blue-600 my-2">
                  {formatCurrency(revenue.membership || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {members.active || 0} member aktif
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="text-2xl mb-2">🎫</div>
                <div className="text-sm text-gray-600 font-medium">Daily Pass (Hari Ini)</div>
                <div className="text-xl font-bold text-green-600 my-2">
                  {formatCurrency(revenue.dailyPass || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {transactions.dailyPass || 0} transaksi
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm text-gray-600 font-medium">Total</div>
                <div className="text-xl font-bold text-purple-600 my-2">
                  {formatCurrency(revenue.total || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {transactions.total || 0} total transaksi
                </div>
              </div>
            </div>
            
            {/* Monthly summary */}
            {(revenue.monthlyDailyPass || 0) > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-sm text-gray-600 font-medium">Bulan Ini</div>
                  <div className="text-lg font-bold text-orange-600 my-2">
                    Daily Pass: {formatCurrency(revenue.monthlyDailyPass || 0)} ({transactions.monthlyDailyPass || 0} transaksi)
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}