'use client';
import { useState, useEffect } from 'react';

interface RevenueChartProps {
  data: any;
  detailed?: boolean;
}

interface ChartItem {
  period: string;
  pendapatan: number;
  jumlah_transaksi: number;
}

export default function RevenueChart({ data, detailed = false }: RevenueChartProps) {
  const [chartType, setChartType] = useState<'revenue' | 'transactions'>('revenue');
  const [chartData, setChartData] = useState<ChartItem[]>([]);

  // Normalize data from various formats
  useEffect(() => {
    if (!data) {
      setChartData([]);
      return;
    }

    // If data is already an array in the expected format
    if (Array.isArray(data) && data.length > 0 && data[0].pendapatan !== undefined) {
      setChartData(data);
      return;
    }

    // If data has monthly array (from financial-reports API)
    if (data.monthly && Array.isArray(data.monthly)) {
      const normalizedData = data.monthly.map((item: any, index: number) => ({
        period: item.month || `Period ${index + 1}`,
        pendapatan: item.revenue || item.pendapatan || 0,
        jumlah_transaksi: item.transactions || item.jumlah_transaksi || Math.round((item.revenue || 0) / 50000) // Estimate transactions
      }));
      setChartData(normalizedData);
      return;
    }

    // If data is an object with revenue data
    if (data.revenue && Array.isArray(data.revenue)) {
      const normalizedData = data.revenue.map((item: any, index: number) => ({
        period: item.month || `Period ${index + 1}`,
        pendapatan: item.revenue || item.pendapatan || 0,
        jumlah_transaksi: item.transactions || item.jumlah_transaksi || Math.round((item.revenue || 0) / 50000)
      }));
      setChartData(normalizedData);
      return;
    }

    // Fallback: create mock data based on available data
    if (data.total) {
      const mockData = [
        { period: 'Hari 1', pendapatan: data.total * 0.3, jumlah_transaksi: Math.round(data.total * 0.3 / 50000) },
        { period: 'Hari 2', pendapatan: data.total * 0.4, jumlah_transaksi: Math.round(data.total * 0.4 / 50000) },
        { period: 'Hari 3', pendapatan: data.total * 0.5, jumlah_transaksi: Math.round(data.total * 0.5 / 50000) },
        { period: 'Hari 4', pendapatan: data.total * 0.45, jumlah_transaksi: Math.round(data.total * 0.45 / 50000) },
        { period: 'Hari 5', pendapatan: data.total * 0.6, jumlah_transaksi: Math.round(data.total * 0.6 / 50000) },
      ];
      setChartData(mockData);
      return;
    }

    setChartData([]);
  }, [data]);

  // Simple chart rendering without external library
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Tidak ada data untuk ditampilkan
        </div>
      );
    }

    const maxValue = Math.max(...chartData.map(item => 
      chartType === 'revenue' ? item.pendapatan : item.jumlah_transaksi
    ));

    return (
      <div className="h-64 flex items-end space-x-2 pt-4">
        {chartData.slice(0, 10).map((item, index) => {
          const value = chartType === 'revenue' ? item.pendapatan : item.jumlah_transaksi;
          const height = (value / maxValue) * 200;
          const label = item.period;

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t w-full max-w-12 transition-all hover:from-blue-600 hover:to-blue-700 cursor-pointer"
                style={{ height: `${Math.max(height, 10)}px` }}
                title={`Rp ${value.toLocaleString('id-ID')}`}
              ></div>
              <div className="text-xs text-gray-600 mt-2 text-center">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalRevenue = chartData.reduce((sum, item) => sum + item.pendapatan, 0);
  const totalTransactions = chartData.reduce((sum, item) => sum + item.jumlah_transaksi, 0);
  const averageRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Grafik Pendapatan</h2>
        <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartType('revenue')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              chartType === 'revenue'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pendapatan
          </button>
          <button
            onClick={() => setChartType('transactions')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              chartType === 'transactions'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Transaksi
          </button>
        </div>
      </div>

      {renderChart()}

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">
            Rp {chartData[0]?.pendapatan?.toLocaleString('id-ID') || 0}
          </div>
          <div className="text-sm text-gray-600">Terbaru</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {totalTransactions}
          </div>
          <div className="text-sm text-gray-600">Total Transaksi</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            Rp {Math.round(averageRevenue).toLocaleString('id-ID')}
          </div>
          <div className="text-sm text-gray-600">Rata-rata</div>
        </div>
      </div>

      {detailed && (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-bold mb-3">Detail {chartData.length} Period Terakhir</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chartData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span className="text-sm">
                  {item.period}
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    Rp {item.pendapatan.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.jumlah_transaksi} transaksi
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}