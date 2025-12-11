'use client';
import { useEffect, useState } from 'react';

interface RevenueChartProps {
  data?: any[];
  detailed?: boolean;
  loading?: boolean;
  isRealTime?: boolean;
}

export default function RevenueChart({ data: propData, detailed = false, loading = false, isRealTime = false }: RevenueChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setIsLoading(true);

        // Jika ada propData, gunakan itu
        if (propData && propData.length > 0) {
          setChartData(propData);
          setIsLoading(false);
          console.log('📊 Using provided chart data:', propData.length, 'days');
          return;
        }

        // Jika tidak, fetch dari API
        console.log('📈 Fetching chart data...');
        const response = await fetch('/api/admin/financial-reports/chart?days=7');
        const result = await response.json();

        if (result.success && result.data) {
          setChartData(result.data);
          console.log('✅ Chart data loaded:', result.data.length, 'days');
        } else {
          setError('Gagal memuat data chart');
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        setError('Terjadi kesalahan saat memuat data');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [propData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const totalRevenue = chartData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalProfit = chartData.reduce((sum, item) => sum + (item.profit || 0), 0);
  const totalTransactions = chartData.reduce((sum, item) => sum + (item.transactions || 0), 0);
  const totalMembership = chartData.reduce((sum, item) => sum + (item.membership || 0), 0);
  const totalDailyPass = chartData.reduce((sum, item) => sum + (item.dailyPass || 0), 0);
  const avgDailyRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
  const avgDailyProfit = chartData.length > 0 ? totalProfit / chartData.length : 0;

  // Find max values for scaling
  const maxRevenue = Math.max(...chartData.map(item => item.revenue || 0), 1);
  const maxProfit = Math.max(...chartData.map(item => item.profit || 0), 1);
  const maxTransactions = Math.max(...chartData.map(item => item.transactions || 0), 1);

  if (isLoading || loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Grafik Pendapatan</h3>
          {isRealTime && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Real-time
            </span>
          )}
        </div>
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <p className="text-gray-500 mb-4">
            {error || 'Tidak ada data untuk ditampilkan'}
          </p>
          <p className="text-sm text-gray-400">
            Data grafik akan muncul di sini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      {/* Header dengan real-time indicator */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Grafik Pendapatan 7 Hari Terakhir</h3>
        {isRealTime && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Real-time
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-sm text-gray-600 font-medium">Total Pendapatan</div>
          <div className="text-xl font-bold text-blue-600 my-2">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-xs text-gray-500">
            {chartData.length} hari
          </div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="text-2xl mb-2">📈</div>
          <div className="text-sm text-gray-600 font-medium">Rata-rata Harian</div>
          <div className="text-xl font-bold text-green-600 my-2">
            {formatCurrency(avgDailyRevenue)}
          </div>
          <div className="text-xs text-gray-500">
            Per hari
          </div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
          <div className="text-2xl mb-2">👥</div>
          <div className="text-sm text-gray-600 font-medium">Total Transaksi</div>
          <div className="text-xl font-bold text-purple-600 my-2">
            {totalTransactions}
          </div>
          <div className="text-xs text-gray-500">
            {chartData.length} hari
          </div>
        </div>

        <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100">
          <div className="text-2xl mb-2">💵</div>
          <div className="text-sm text-gray-600 font-medium">Total Laba</div>
          <div className="text-xl font-bold text-orange-600 my-2">
            {formatCurrency(totalProfit)}
          </div>
          <div className="text-xs text-gray-500">
            {chartData.length} hari
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="mt-8">
        {/* Y-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mb-2 px-4">
          <div>Rp {formatCurrency(maxRevenue).replace('Rp', '')}</div>
          <div>Transaksi: {maxTransactions}</div>
        </div>

        {/* Chart Bars */}
        <div className="h-64 relative border-b border-l border-gray-200">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 0.25, 0.5, 0.75, 1].map((line, index) => (
              <div
                key={index}
                className="border-t border-gray-100"
              ></div>
            ))}
          </div>

          {/* Bars Container - FIXED: Use pixel heights for proper rendering */}
          <div className="absolute inset-0 flex items-end justify-around px-2 pb-8">
            {chartData.map((item, index) => {
              // Calculate heights in pixels (max bar height = 200px)
              const maxBarHeight = 200;
              const memberHeight = maxRevenue > 0 ? (item.membership / maxRevenue) * maxBarHeight : 0;
              const dailyPassHeight = maxRevenue > 0 ? (item.dailyPass / maxRevenue) * maxBarHeight : 0;
              const totalHeight = memberHeight + dailyPassHeight;

              return (
                <div key={index} className="flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  {/* Bar and Tooltip container */}
                  <div className="relative group flex flex-col items-center">
                    {/* Stacked Bars */}
                    <div className="flex flex-col-reverse items-center">
                      {/* Member Bar (Blue) - Bottom */}
                      {memberHeight > 0 && (
                        <div
                          className="w-8 bg-blue-500 transition-all duration-300 group-hover:bg-blue-600 group-hover:shadow-lg"
                          style={{ height: `${Math.max(memberHeight, 2)}px` }}
                        ></div>
                      )}
                      {/* Daily Pass Bar (Green) - Top */}
                      {dailyPassHeight > 0 && (
                        <div
                          className="w-8 bg-green-500 rounded-t-lg transition-all duration-300 group-hover:bg-green-600 group-hover:shadow-lg"
                          style={{ height: `${Math.max(dailyPassHeight, 2)}px` }}
                        ></div>
                      )}
                      {/* If no data, show minimal indicator */}
                      {totalHeight === 0 && (
                        <div className="w-8 h-1 bg-gray-200 rounded"></div>
                      )}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-20 min-w-[180px]">
                      <div className="font-semibold mb-2 border-b border-gray-700 pb-1">
                        {new Date(item.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Total:</span>
                          <span className="font-medium">{formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-blue-300">💳 Member:</span>
                          <span className="font-medium text-blue-300">{formatCurrency(item.membership)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-green-300">🎫 Daily Pass:</span>
                          <span className="font-medium text-green-300">{formatCurrency(item.dailyPass)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date Label */}
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    {new Date(item.date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
          <div>Tanggal</div>
          <div>Hover untuk detail</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-10 pt-6 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-600">💳 Member (Rp)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">🎫 Daily Pass (Rp)</span>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h4 className="text-md font-semibold text-gray-800 mb-4">Detail Pendapatan 7 Hari</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-blue-600 font-semibold mb-2">💳 Membership</div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalMembership)}</div>
            <div className="text-sm text-blue-600 mt-1">
              {Math.round(totalMembership / chartData.length / 1000)}k/hari
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-green-600 font-semibold mb-2">🎫 Daily Pass</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalDailyPass)}</div>
            <div className="text-sm text-green-600 mt-1">
              {totalTransactions} transaksi ({Math.round(totalTransactions / chartData.length)}/hari)
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-purple-600 font-semibold mb-2">📊 Total</div>
            <div className="text-2xl font-bold text-purple-700">{formatCurrency(totalRevenue)}</div>
            <div className="text-sm text-purple-600 mt-1">
              {Math.round(totalRevenue / chartData.length / 1000)}k/hari
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-orange-600 font-semibold mb-2">📈 Laba</div>
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalProfit)}</div>
            <div className="text-sm text-orange-600 mt-1">
              {Math.round(totalProfit / chartData.length / 1000)}k/hari
            </div>
          </div>
        </div>
      </div>

      {/* Detailed table jika diperlukan */}
      {detailed && chartData.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Detail Harian</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600">Tanggal</th>
                  <th className="text-right py-2 text-gray-600">Pendapatan</th>
                  <th className="text-right py-2 text-gray-600">Transaksi</th>
                  <th className="text-right py-2 text-gray-600">Membership</th>
                  <th className="text-right py-2 text-gray-600">Daily Pass</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2">
                      {new Date(item.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                    <td className="text-right py-2 font-medium">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="text-right py-2">
                      {item.transactions}
                    </td>
                    <td className="text-right py-2 text-blue-600">
                      {formatCurrency(item.membership)}
                    </td>
                    <td className="text-right py-2 text-green-600">
                      {formatCurrency(item.dailyPass)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}