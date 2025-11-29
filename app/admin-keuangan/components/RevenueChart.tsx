'use client';
import { useState, useEffect } from 'react';

interface RevenueChartProps {
  data: any[];
  detailed?: boolean;
}

interface ChartData {
  date: string;
  revenue: number;
  transactions?: number;
  membership?: number;
  dailyPass?: number;
}

export default function RevenueChart({ data, detailed = false }: RevenueChartProps) {
  const [chartType, setChartType] = useState<'revenue' | 'transactions' | 'breakdown'>('revenue');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      setChartData([]);
      return;
    }

    // Use the provided data directly
    const normalizedData = data.map(item => ({
      date: item.date,
      revenue: item.revenue || 0,
      transactions: item.transactions || 0,
      membership: item.membership || 0,
      dailyPass: item.dailyPass || 0
    }));

    setChartData(normalizedData);
  }, [data]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Tidak ada data untuk ditampilkan</p>
          <p className="text-sm mt-1">Data grafik akan muncul di sini</p>
        </div>
      );
    }

    const maxValue = Math.max(
      ...chartData.map(item => {
        switch (chartType) {
          case 'revenue': return item.revenue;
          case 'transactions': return item.transactions || 0;
          case 'breakdown': return Math.max(item.membership || 0, item.dailyPass || 0);
          default: return item.revenue;
        }
      })
    );

    return (
      <div className="h-64 flex items-end space-x-1 pt-4 px-2">
        {chartData.slice(-15).map((item, index) => {
          let value = 0;
          let breakdown = null;

          switch (chartType) {
            case 'revenue':
              value = item.revenue;
              break;
            case 'transactions':
              value = item.transactions || 0;
              break;
            case 'breakdown':
              value = (item.membership || 0) + (item.dailyPass || 0);
              breakdown = {
                membership: item.membership || 0,
                dailyPass: item.dailyPass || 0
              };
              break;
          }

          const height = maxValue > 0 ? (value / maxValue) * 180 : 0;
          const label = new Date(item.date).toLocaleDateString('id-ID', { 
            month: 'short', 
            day: 'numeric' 
          });

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="relative w-full max-w-8" style={{ height: `${Math.max(height, 8)}px` }}>
                {breakdown ? (
                  // Stacked bar for breakdown
                  <div className="absolute bottom-0 w-full h-full flex flex-col-reverse">
                    <div 
                      className="bg-green-500 w-full"
                      style={{ height: `${((breakdown.dailyPass || 0) / value) * 100}%` }}
                      title={`Daily Pass: Rp ${(breakdown.dailyPass || 0).toLocaleString('id-ID')}`}
                    ></div>
                    <div 
                      className="bg-blue-500 w-full"
                      style={{ height: `${((breakdown.membership || 0) / value) * 100}%` }}
                      title={`Membership: Rp ${(breakdown.membership || 0).toLocaleString('id-ID')}`}
                    ></div>
                  </div>
                ) : (
                  // Single bar for revenue/transactions
                  <div
                    className={`w-full rounded-t transition-all hover:opacity-80 cursor-pointer ${
                      chartType === 'revenue' 
                        ? 'bg-gradient-to-t from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-t from-green-500 to-green-600'
                    }`}
                    style={{ height: `${Math.max(height, 8)}px` }}
                    title={
                      chartType === 'revenue' 
                        ? `Rp ${value.toLocaleString('id-ID')}`
                        : `${value} transaksi`
                    }
                  ></div>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-2 text-center leading-tight">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = chartData.reduce((sum, item) => sum + (item.transactions || 0), 0);
  const latestRevenue = chartData[chartData.length - 1]?.revenue || 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Grafik Pendapatan</h2>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartType('revenue')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              chartType === 'revenue'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pendapatan
          </button>
          <button
            onClick={() => setChartType('transactions')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              chartType === 'transactions'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Transaksi
          </button>
          <button
            onClick={() => setChartType('breakdown')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              chartType === 'breakdown'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Breakdown
          </button>
        </div>
      </div>

      {renderChart()}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-lg font-bold text-blue-600">
            Rp {latestRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-600">Terbaru</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-bold text-green-600">
            {totalTransactions}
          </div>
          <div className="text-xs text-gray-600">Total Transaksi</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-lg font-bold text-purple-600">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-600">Total Pendapatan</div>
        </div>
      </div>

      {detailed && chartData.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-bold mb-3">Detail {Math.min(chartData.length, 10)} Hari Terakhir</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chartData.slice(-10).map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span className="text-sm font-medium">
                  {new Date(item.date).toLocaleDateString('id-ID', { 
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    Rp {item.revenue.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-gray-500 flex space-x-2">
                    <span>M: Rp {(item.membership || 0).toLocaleString('id-ID')}</span>
                    <span>D: Rp {(item.dailyPass || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend for breakdown */}
      {chartType === 'breakdown' && (
        <div className="mt-4 flex justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Membership</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Daily Pass</span>
          </div>
        </div>
      )}
    </div>
  );
}