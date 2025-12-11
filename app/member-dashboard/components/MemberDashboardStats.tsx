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
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800"></h2>
        <div className="text-sm text-gray-500">
          
        </div>
      </div>

      
      {/* Info tambahan */}
      <div className="">
        <div className="">
          <div className="">
            <div className="">
              <div className="">
               
              </div>
              <div>
                
              </div>
            </div>
          </div>
          
          <div className="">
            <div className="">
              <div className="">
                
              </div>
              <div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}