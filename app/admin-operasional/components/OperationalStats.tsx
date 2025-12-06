// app/admin-operasional/components/OperationalStats.tsx
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

  // Debug: log data yang diterima
  useEffect(() => {
    console.log('📊 OperationalStats received data:', data);
  }, [data]);

  const stats = [
    {
      title: 'Pengunjung Hari Ini',
      value: data?.todayVisitors || 0,
      change: 12,
      icon: '👥',
      color: 'blue',
      description: `👤 ${data?.memberCheckins || 0} member • 🎫 ${data?.nonMemberCheckins || 0} daily pass`
    },
    {
      title: 'Member Aktif',
      value: data?.activeMembers || 0,
      change: 5,
      icon: '✅',
      color: 'green',
      description: 'Total member dengan status aktif'
    },
    {
      title: 'Kapasitas Gym',
      value: `${data?.facilityUsage || 0}%`,
      change: -8,
      icon: '🏋️',
      color: 'orange',
      description: `${data?.currentCapacity || 0} orang sedang berolahraga`
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

  // Additional mini stats
  const miniStats = [
    {
      title: 'Check-in Member',
      value: data?.memberCheckins || 0,
      icon: '👤',
      color: 'blue'
    },
    {
      title: 'Check-in Daily Pass',
      value: data?.nonMemberCheckins || 0,
      icon: '🎫',
      color: 'orange'
    },
    {
      title: 'Personal Training',
      value: data?.personalTrainingSessions || 0,
      icon: '💪',
      color: 'red'
    },
    {
      title: 'Kelas Fitness',
      value: data?.classAttendances || 0,
      icon: '🧘',
      color: 'purple'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Statistik Operasional</h2>
          <p className="text-sm text-gray-600">
            Update: {currentTime.toLocaleTimeString('id-ID', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
          {currentTime.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {miniStats.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                stat.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                stat.color === 'red' ? 'bg-red-100 text-red-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-700">
            <span className="font-semibold">Total pengunjung hari ini:</span> {data?.todayVisitors || 0}
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Member: {data?.memberCheckins || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
              <span>Daily Pass: {data?.nonMemberCheckins || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}