'use client';

interface MemberDashboardStatsProps {
  data: {
    totalVisits: number;
    monthlyVisits: number;
    averageDuration: number;
    favoriteFacility: string;
    lastVisit: string;
    membershipDaysLeft: number;
    attendanceStreak: number;
  };
}

export default function MemberDashboardStats({ data }: MemberDashboardStatsProps) {
  // Format tanggal untuk last visit
  const formatLastVisit = (dateString: string) => {
    if (dateString === 'Belum pernah') return dateString;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const stats = [
    {
      title: 'Total Kunjungan',
      value: data.totalVisits,
      icon: '📊',
      color: 'bg-blue-100 text-blue-800',
      bgColor: 'bg-blue-50',
      suffix: 'kali'
    },
    {
      title: 'Kunjungan Bulan Ini',
      value: data.monthlyVisits,
      icon: '📅',
      color: 'bg-green-100 text-green-800',
      bgColor: 'bg-green-50',
      suffix: 'kali'
    },
    {
      title: 'Rata-rata Durasi',
      value: data.averageDuration,
      icon: '⏱️',
      color: 'bg-purple-100 text-purple-800',
      bgColor: 'bg-purple-50',
      suffix: 'menit'
    },
    {
      title: 'Streak Hadir',
      value: data.attendanceStreak,
      icon: '⚡',
      color: 'bg-yellow-100 text-yellow-800',
      bgColor: 'bg-yellow-50',
      suffix: 'hari'
    },
    {
      title: 'Fasilitas Favorit',
      value: data.favoriteFacility || '-',
      icon: '🏆',
      color: 'bg-red-100 text-red-800',
      bgColor: 'bg-red-50',
      suffix: ''
    },
    {
      title: 'Sisa Membership',
      value: data.membershipDaysLeft,
      icon: '🎫',
      color: data.membershipDaysLeft > 30 ? 'bg-green-100 text-green-800' : 
             data.membershipDaysLeft > 7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800',
      bgColor: data.membershipDaysLeft > 30 ? 'bg-green-50' : 
              data.membershipDaysLeft > 7 ? 'bg-yellow-50' : 'bg-red-50',
      suffix: 'hari'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">📈 Statistik Anggota</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} rounded-xl p-4 border hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color.split(' ')[0]}`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              {typeof stat.value === 'number' && stat.title !== 'Sisa Membership' && (
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${stat.color}`}>
                  {stat.value > 0 ? '+' : ''}{stat.value}
                </div>
              )}
            </div>
            
            <div className="text-xl font-bold text-gray-800 mb-1 truncate">
              {typeof stat.value === 'number' ? stat.value : stat.value}
              {stat.suffix && <span className="text-sm ml-1">{stat.suffix}</span>}
            </div>
            
            <div className="text-xs text-gray-600 truncate">{stat.title}</div>
            
            {/* Progress indicator untuk beberapa stats */}
            {stat.title === 'Sisa Membership' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      data.membershipDaysLeft > 30 ? 'bg-green-500' :
                      data.membershipDaysLeft > 7 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((data.membershipDaysLeft / 365) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {stat.title === 'Streak Hadir' && data.attendanceStreak > 0 && (
              <div className="mt-2 flex items-center">
                <div className="flex space-x-1">
                  {[...Array(Math.min(data.attendanceStreak, 5))].map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                      i < data.attendanceStreak ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  ))}
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {data.attendanceStreak >= 5 ? '🔥 Hot streak!' : 'Keep going!'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info tambahan */}
      <div className="pt-6 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <span className="text-blue-600 text-lg">📅</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Kunjungan Terakhir</h3>
                <p className="text-sm text-gray-600">
                  {formatLastVisit(data.lastVisit)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <span className="text-green-600 text-lg">💡</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Rekomendasi</h3>
                <p className="text-sm text-gray-600">
                  {data.totalVisits > 10 ? 'Konsisten! Pertahankan momentum' :
                   data.totalVisits > 0 ? 'Bagus! Tingkatkan frekuensi kunjungan' :
                   'Ayo mulai kunjungi gym untuk mendapatkan manfaat maksimal'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}