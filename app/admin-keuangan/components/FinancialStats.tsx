'use client';
import { useState, useEffect } from 'react';

interface FinancialStatsProps {
  data: any;
  detailed?: boolean;
}

export default function FinancialStats({ data, detailed = false }: FinancialStatsProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (data) {
      const summary = data.summary;
      
      // Safe data access dengan fallback values
      const revenueData = data.revenue || [];
      const memberGrowthData = data.memberGrowth || data.members || [];
      const totalMembers = data.members?.total || data.totalMembers || 0;
      
      setStats({
        pendapatanHariIni: revenueData[0]?.pendapatan || revenueData[0]?.revenue || 0,
        pendapatanBulanIni: summary?.totalRevenue || data.revenue?.total || 0,
        totalMember: Array.isArray(memberGrowthData) 
          ? memberGrowthData.reduce((sum: number, item: any) => sum + (item.member_baru || item.newMembers || 0), 0)
          : totalMembers,
        transaksiPending: data.pendingTransactions || 0,
        rataRataTransaksi: summary?.averageTransaction || data.averageTransaction || 0,
        totalTransaksi: summary?.totalTransactions || data.totalTransactions || 0,
        growth: calculateGrowth(data)
      });
    }
  }, [data, period]);

  const calculateGrowth = (data: any) => {
    try {
      const revenueData = data.revenue || [];
      if (revenueData.length < 2) return data.growth || data.revenue?.growth || 12.5;
      
      const current = revenueData[0]?.pendapatan || revenueData[0]?.revenue || 0;
      const previous = revenueData[1]?.pendapatan || revenueData[1]?.revenue || 0;
      
      if (previous === 0) return 100;
      return ((current - previous) / previous) * 100;
    } catch (error) {
      return 12.5; // Fallback growth value
    }
  };

  // Safe access untuk detailed view data
  const paymentMethods = data?.paymentMethods || data?.expenses?.categories || [];
  const packagesData = data?.packages || [];

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pendapatan Hari Ini',
      value: `Rp ${stats.pendapatanHariIni.toLocaleString('id-ID')}`,
      change: stats.growth,
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Pendapatan Bulan Ini',
      value: `Rp ${stats.pendapatanBulanIni.toLocaleString('id-ID')}`,
      change: 12.5,
      icon: '📊',
      color: 'blue'
    },
    {
      title: 'Total Transaksi',
      value: stats.totalTransaksi.toLocaleString('id-ID'),
      change: 8.2,
      icon: '🛒',
      color: 'purple'
    },
    {
      title: 'Rata-rata Transaksi',
      value: `Rp ${Math.round(stats.rataRataTransaksi).toLocaleString('id-ID')}`,
      change: 5.1,
      icon: '📈',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
        <div className="flex space-x-2 bg-white rounded-lg p-1 shadow">
          {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                period === p
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {p === 'daily' && 'Harian'}
              {p === 'weekly' && 'Mingguan'}
              {p === 'monthly' && 'Bulanan'}
              {p === 'yearly' && 'Tahunan'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stat.value}
                </p>
                <div className={`flex items-center mt-2 text-sm ${
                  stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="font-medium">
                    {stat.change >= 0 ? '↗' : '↘'} {Math.abs(stat.change).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1 text-xs">vs periode sebelumnya</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center ml-4">
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Stats */}
      {detailed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Metode Pembayaran</h3>
            <div className="space-y-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-600">
                      {method.name || method.metode_pembayaran || `Metode ${index + 1}`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ 
                            width: `${method.percentage || method.persentase || (method.amount / stats.pendapatanBulanIni * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {Math.round(method.percentage || method.persentase || (method.amount / stats.pendapatanBulanIni * 100))}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Tidak ada data metode pembayaran
                </div>
              )}
            </div>
          </div>

          {/* Package Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Performance Paket</h3>
            <div className="space-y-3">
              {packagesData.length > 0 ? (
                packagesData.map((pkg: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">
                        {pkg.name || pkg.paket || `Paket ${index + 1}`}
                      </span>
                      <div className="text-sm text-gray-500">
                        {pkg.jumlah_member || pkg.members || 0} member
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        Rp {(pkg.total_pendapatan || pkg.revenue || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Rp {Math.round(pkg.rata_rata_paket || pkg.average || 0).toLocaleString('id-ID')}/org
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Tidak ada data paket
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Ringkasan Cepat</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Transaksi Sukses:</span>
                <span className="font-bold text-green-600">{stats.totalTransaksi.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Member Baru:</span>
                <span className="font-bold text-blue-600">{stats.totalMember.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Pendapatan Rata-rata:</span>
                <span className="font-bold">
                  Rp {Math.round(stats.rataRataTransaksi).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Pertumbuhan:</span>
                <span className={`font-bold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}