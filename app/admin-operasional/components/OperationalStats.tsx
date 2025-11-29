'use client';
import { useState, useEffect } from 'react';

interface OperationalStatsProps {
  data: {
    todayVisitors: number;
    activeMembers: number;
    currentCapacity: number;
    todayRevenue: number;
    monthlyRevenue: number;
    facilityUsage: number;
    memberCheckins: number;
    nonMemberCheckins: number;
    personalTrainingSessions: number;
    classAttendances: number;
  };
}

export default function OperationalStats({ data }: OperationalStatsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    {
      title: 'Pengunjung Hari Ini',
      value: data?.todayVisitors || 0,
      change: 12,
      icon: '👥',
      color: 'blue',
      description: `${data?.memberCheckins || 0} member, ${data?.nonMemberCheckins || 0} non-member`
    },
    {
      title: 'Member Aktif',
      value: data?.activeMembers || 0,
      change: 5,
      icon: '✅',
      color: 'green',
      description: 'Total member aktif'
    },
    {
      title: 'Kapasitas Gym',
      value: `${data?.currentCapacity || 0}%`,
      change: -8,
      icon: '🏋️',
      color: 'orange',
      description: 'Penggunaan fasilitas'
    },
    {
      title: 'Pendapatan Hari Ini',
      value: `Rp ${(data?.todayRevenue || 0).toLocaleString('id-ID')}`,
      change: 15,
      icon: '💰',
      color: 'purple',
      description: `Rp ${(data?.monthlyRevenue || 0).toLocaleString('id-ID')} bulan ini`
    }
  ];

  const getColorClass = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
      purple: 'from-purple-500 to-purple-600'
    };
    return colors[color as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Statistik Operasional</h2>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
          {currentTime.toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mb-2">
                  {stat.value}
                </p>
                <div className={`flex items-center mb-2 text-sm ${
                  stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="font-semibold">
                    {stat.change >= 0 ? '↗' : '↘'} {Math.abs(stat.change)}%
                  </span>
                  <span className="text-gray-500 ml-1 text-xs">vs kemarin</span>
                </div>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-r ${getColorClass(stat.color)} rounded-full flex items-center justify-center shadow-lg`}>
                <span className="text-xl text-white">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}