'use client';
import { useState, useEffect } from 'react';
import { VisitorData } from '../types';

interface VisitorChartProps {
  data: VisitorData;
}

export default function VisitorChart({ data }: VisitorChartProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      if (timeRange === 'weekly') {
        setChartData(data.weekly || []);
      } else if (timeRange === 'monthly') {
        setChartData(data.monthly || []);
      } else {
        // Daily view - create from today's data
        setChartData([{
          date: 'Hari Ini',
          visitors: data.today?.total || 0,
          members: data.today?.members || 0,
          nonMembers: data.today?.nonMembers || 0
        }]);
      }
    }
  }, [data, timeRange]);

  const maxVisitors = Math.max(...(chartData?.map((item: any) => item.visitors) || [1]));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Statistik Pengunjung</h2>
        <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
          {['daily', 'weekly', 'monthly'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {range === 'daily' && 'Harian'}
              {range === 'weekly' && 'Mingguan'}
              {range === 'monthly' && 'Bulanan'}
            </button>
          ))}
        </div>
      </div>

      {!chartData || chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Menunggu data pengunjung...</p>
          <p className="text-sm mt-1">Data akan muncul saat ada aktivitas presensi</p>
        </div>
      ) : (
        <>
          <div className="h-64 flex items-end space-x-2 mb-6">
            {chartData.map((item: any, index: number) => {
              const height = item.visitors > 0 ? (item.visitors / maxVisitors) * 200 : 10;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center space-y-1">
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t w-full max-w-12 transition-all hover:from-blue-600 hover:to-blue-700 cursor-pointer relative group"
                      style={{ height: `${Math.max(height, 10)}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.visitors} pengunjung
                        {item.members !== undefined && ` (${item.members} member)`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 font-medium text-center">
                      {item.date || item.month || 'Today'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600">
                {data?.today?.total || 0}
              </div>
              <div className="text-xs text-blue-800">Hari Ini</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">
                {data?.today?.members || 0}
              </div>
              <div className="text-xs text-green-800">Member</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-lg font-bold text-orange-600">
                {data?.today?.nonMembers || 0}
              </div>
              <div className="text-xs text-orange-800">Non-Member</div>
            </div>
          </div>

          {/* Peak Hours */}
          {data?.today?.peakHour && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-800 text-center">
                🕐 Jam Puncak: <strong>{data.today.peakHour}</strong>
              </div>
            </div>
          )}

          {/* Data Info */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Data real-time dari Firebase • Terakhir update: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </>
      )}
    </div>
  );
}