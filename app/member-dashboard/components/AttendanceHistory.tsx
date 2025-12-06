// app/member-dashboard/components/AttendanceHistory.tsx
'use client';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  facility: string | null;
  duration: string | null;
  status: string;
}

interface AttendanceHistoryProps {
  data: AttendanceRecord[];
  loading?: boolean;
  detailed?: boolean;
}

export default function AttendanceHistory({ data, loading = false, detailed = false }: AttendanceHistoryProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === '-') return '-';
    try {
      // Jika timeString sudah dalam format waktu (HH:MM)
      if (timeString.match(/^\d{1,2}:\d{2}$/)) {
        return timeString;
      }
      const date = new Date(timeString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'checked_out':
      case 'selesai':
        return 'bg-green-100 text-green-800';
      case 'checked_in':
      case 'aktif':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFacilityIcon = (facility: string | null) => {
    if (!facility) return '🏋️';
    const fac = facility.toLowerCase();
    if (fac.includes('cardio')) return '🏃';
    if (fac.includes('weight') || fac.includes('angkat')) return '🏋️';
    if (fac.includes('yoga')) return '🧘';
    if (fac.includes('studio')) return '🎭';
    if (fac.includes('pool') || fac.includes('kolam')) return '🏊';
    return '🏋️';
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'checked_out':
      case 'selesai':
        return 'Selesai';
      case 'checked_in':
      case 'aktif':
        return 'Aktif';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center border">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat riwayat kunjungan...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center border">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada riwayat kunjungan</h3>
        <p className="text-gray-500">Riwayat kunjungan akan muncul di sini setelah Anda berkunjung ke gym</p>
      </div>
    );
  }

  // Hitung statistik
  const totalVisits = data.length;
  const completedVisits = data.filter(v => 
    v.status.toLowerCase().includes('completed') || 
    v.status.toLowerCase().includes('checked_out') ||
    v.status.toLowerCase().includes('selesai')
  ).length;
  
  // Cari fasilitas favorit
  const facilityCount: Record<string, number> = {};
  data.forEach(visit => {
    if (visit.facility) {
      facilityCount[visit.facility] = (facilityCount[visit.facility] || 0) + 1;
    }
  });
  const favoriteFacility = Object.entries(facilityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Area Cardio';

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">📝 Riwayat Terbaru</h2>
          <span className="text-sm text-gray-500">{totalVisits} kunjungan</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-blue-600">{totalVisits}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-green-600">{completedVisits}</div>
            <div className="text-sm text-gray-600">Selesai</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center border">
            <div className="text-2xl font-bold text-purple-600 truncate" title={favoriteFacility}>
              {favoriteFacility.length > 10 ? favoriteFacility.substring(0, 8) + '...' : favoriteFacility}
            </div>
            <div className="text-sm text-gray-600">Favorit</div>
          </div>
        </div>

        {/* Recent Visits */}
        <div className="space-y-4">
          {data.slice(0, 5).map((record) => (
            <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <span className="text-2xl mr-3 mt-1">{getFacilityIcon(record.facility)}</span>
                  <div>
                    <div className="font-semibold">{record.facility || 'Gym Area'}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(record.date)} • {formatTime(record.checkInTime)}
                      {record.checkOutTime && ` - ${formatTime(record.checkOutTime)}`}
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                  {getStatusText(record.status)}
                </span>
              </div>
              {record.duration && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <span className="mr-2">⏱️</span>
                  <span>Durasi: {record.duration}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Menampilkan {Math.min(data.length, 5)} dari {data.length} kunjungan
          </p>
        </div>
      </div>
    );
  }

  // Detailed View
  return (
    <div className="bg-white rounded-xl shadow-lg border">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📋 Riwayat Kunjungan Lengkap</h2>
            <p className="text-gray-600">Semua kunjungan Anda ke gym</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {totalVisits} kunjungan
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {completedVisits} selesai
            </span>
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fasilitas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durasi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{formatDate(record.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{formatTime(record.checkInTime)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="mr-2">{getFacilityIcon(record.facility)}</span>
                        <span className="text-sm">{record.facility || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{record.duration || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t text-sm text-gray-500 text-center">
            Menampilkan {data.length} kunjungan
          </div>
        </>
      ) : (
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada riwayat kunjungan</h3>
          <p className="text-gray-500">Lakukan check-in pertama Anda untuk memulai</p>
        </div>
      )}
    </div>
  );
}