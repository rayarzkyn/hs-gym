'use client';
import { useEffect, useState } from 'react';

interface FinancialStatsProps {
  data: any;
  detailed?: boolean;
  lastUpdate?: string;
}

interface StatsData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    activeMembers: number;
    pendingMembers: number;
    activeNonMembers: number;
    totalTransactions: number;
    memberTransactions: number;
    nonMemberTransactions: number;
  };
  revenue: {
    total: number;
    membership: number;
    dailyPass: number;
    other: number;
  };
  transactions: {
    total: number;
    membership: number;
    dailyPass: number;
    date: string;
  };
  members: {
    active: number;
    pending: number;
    total: number;
  };
  debug?: any;
  lastUpdated?: string;
}

export default function FinancialStats({ data, detailed = false, lastUpdate }: FinancialStatsProps) {
  const [statsData, setStatsData] = useState<StatsData | null>(null);

  useEffect(() => {
    if (data) {
      setStatsData(data);
      console.log('📊 FinancialStats received data:', data);
    }
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!statsData) {
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

  // Calculate trends
  const calculateTrend = (current: number, previous: number = current * 0.8) => {
    if (previous === 0) return { value: '+0%', trend: 'up' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      trend: change >= 0 ? 'up' : 'down'
    };
  };

  const revenueTrend = calculateTrend(statsData.summary.totalRevenue);
  const expenseTrend = calculateTrend(statsData.summary.totalExpenses);
  const profitTrend = calculateTrend(statsData.summary.netProfit);
  const transactionTrend = calculateTrend(statsData.summary.totalTransactions);

  const stats = [
    {
      title: 'Total Pendapatan',
      value: formatCurrency(statsData.summary.totalRevenue),
      change: revenueTrend.value,
      trend: revenueTrend.trend,
      icon: '💰',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `Membership: ${formatCurrency(statsData.revenue.membership)} | Daily Pass: ${formatCurrency(statsData.revenue.dailyPass)}`
    },
    {
      title: 'Total Pengeluaran',
      value: formatCurrency(statsData.summary.totalExpenses),
      change: expenseTrend.value,
      trend: expenseTrend.trend,
      icon: '📤',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Laba Bersih',
      value: formatCurrency(statsData.summary.netProfit),
      change: profitTrend.value,
      trend: profitTrend.trend,
      icon: '📈',
      color: statsData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: statsData.summary.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'
    },
    {
      title: 'Total Transaksi',
      value: statsData.summary.totalTransactions.toString(),
      change: transactionTrend.value,
      trend: transactionTrend.trend,
      icon: '💳',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: `Member: ${statsData.transactions.membership} | Daily Pass: ${statsData.transactions.dailyPass}`
    }
  ];

  const detailedStats = [
    {
      title: 'Member Aktif',
      value: statsData.members.active.toString(),
      icon: '🏋️',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      revenue: formatCurrency(statsData.revenue.membership)
    },
    {
      title: 'Member Pending',
      value: statsData.members.pending.toString(),
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Daily Pass Aktif',
      value: statsData.summary.activeNonMembers.toString(),
      icon: '🎫',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Transaksi Daily Pass',
      value: statsData.summary.nonMemberTransactions.toString(),
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      revenue: formatCurrency(statsData.revenue.dailyPass)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Last Update Indicator */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
        <div className="text-sm text-gray-500">
          Terakhir update: <span className="font-medium">{lastUpdate}</span>
        </div>
      </div>

      {/* Debug Info - Show detailed debug info */}
      {statsData.debug && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Info Data:</h4>
          <div className="text-xs text-blue-700 grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>Membership Revenue: <strong>{formatCurrency(statsData.debug.membershipRevenue)}</strong></div>
            <div>Daily Pass Revenue: <strong>{formatCurrency(statsData.debug.dailyPassRevenueFromTransactions)}</strong></div>
            <div>Total Revenue: <strong>{formatCurrency(statsData.debug.totalRevenue)}</strong></div>
            <div>Active Members: <strong>{statsData.debug.activeMembersCount}</strong></div>
            <div>Non-Member Transactions: <strong>{statsData.debug.nonMemberTransactionsCount}</strong></div>
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
                <p className="text-xs text-gray-500">
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
                  {formatCurrency(statsData.revenue.membership)}
                </div>
                <div className="text-xs text-gray-500">
                  {statsData.transactions.membership} member aktif
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="text-2xl mb-2">🎫</div>
                <div className="text-sm text-gray-600 font-medium">Daily Pass</div>
                <div className="text-xl font-bold text-green-600 my-2">
                  {formatCurrency(statsData.revenue.dailyPass)}
                </div>
                <div className="text-xs text-gray-500">
                  {statsData.transactions.dailyPass} transaksi
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm text-gray-600 font-medium">Total</div>
                <div className="text-xl font-bold text-purple-600 my-2">
                  {formatCurrency(statsData.revenue.total)}
                </div>
                <div className="text-xs text-gray-500">
                  {statsData.transactions.total} total transaksi
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}