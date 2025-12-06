// app/admin-operasional/components/AttendanceTracker.tsx
'use client';

interface TodayVisit {
  id: string;
  userId?: string;
  userName: string;
  type: 'member' | 'non-member-daily';
  checkInTime: string;
  checkOutTime?: string;
  facility?: string;
  status: 'checked-in' | 'checked-out';
}

interface MemberData {
  id: string;
  nama?: string;
  fullName?: string;
  username?: string;
  nomor_member?: string;
  [key: string]: any;
}

interface AttendanceTrackerProps {
  data: TodayVisit[];
  membersData: MemberData[];
  detailed?: boolean;
}

export default function AttendanceTracker({ 
  data, 
  membersData = [],
  detailed = false
}: AttendanceTrackerProps) {
  
  // Filter hanya yang checked-in
  const currentCheckedIn = data.filter(item => item.status === 'checked-in');
  
  // Summary stats
  const memberCheckins = data.filter(item => item.type === 'member').length;
  const nonMemberCheckins = data.filter(item => item.type === 'non-member-daily').length;
  const totalCheckins = memberCheckins + nonMemberCheckins;
  
  // Format waktu
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  };
  
  const formatDuration = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return 'Masuk';
    try {
      const start = new Date(checkIn).getTime();
      const end = new Date(checkOut).getTime();
      const minutes = Math.floor((end - start) / (1000 * 60));
      
      if (minutes < 60) {
        return `${minutes}m`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
      }
    } catch {
      return 'Selesai';
    }
  };

  // Get status color
  const getStatusColor = (status: 'checked-in' | 'checked-out') => {
    return status === 'checked-in' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: 'checked-in' | 'checked-out') => {
    return status === 'checked-in' ? 'Masuk' : 'Keluar';
  };

  // Get type color
  const getTypeColor = (type: 'member' | 'non-member-daily') => {
    return type === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
  };

  const getTypeText = (type: 'member' | 'non-member-daily') => {
    return type === 'member' ? 'Member' : 'Daily Pass';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
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

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Presensi Hari Ini</h2>
            <p className="text-gray-600">
              {currentCheckedIn.length} orang sedang di gym • Total: {totalCheckins} kunjungan
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCheckins}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{memberCheckins}</div>
              <div className="text-xs text-gray-600">Member</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{nonMemberCheckins}</div>
              <div className="text-xs text-gray-600">Non-Member</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{currentCheckedIn.length}</div>
              <div className="text-xs text-gray-600">Masuk</div>
            </div>
          </div>
        </div>

        {/* Current Check-ins */}
        {currentCheckedIn.length > 0 ? (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Sedang di Gym ({currentCheckedIn.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentCheckedIn.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border ${
                    item.type === 'member' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-800">{item.userName}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(item.type)}`}>
                          {getTypeText(item.type)}
                        </span>
                        {item.facility && (
                          <span className="text-xs text-gray-600">{item.facility}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatTime(item.checkInTime)}
                      </div>
                      <div className="text-xs text-gray-500">Check-in</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Durasi: {formatDuration(item.checkInTime, item.checkOutTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 mb-6 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-3">🏋️‍♂️</div>
            <p className="text-gray-500">Belum ada yang check-in hari ini</p>
          </div>
        )}

        {/* Recent Activity */}
        {data.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Aktivitas Terbaru</h3>
            <div className="space-y-3">
              {data.slice(0, 5).map((item) => (
                <div key={`${item.id}-${item.userName}-${item.checkInTime}`} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.userName}</div>
                      <div className="text-sm text-gray-600">
                        {formatTime(item.checkInTime)} • {item.facility || 'Gym Area'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(item.type)}`}>
                        {getTypeText(item.type)}
                      </span>
                    </div>
                  </div>
                  {item.checkOutTime && (
                    <div className="mt-2 text-sm text-gray-600">
                      Durasi: {formatDuration(item.checkInTime, item.checkOutTime)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {data.length > 5 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">
                  Menampilkan 5 dari {data.length} aktivitas
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed View
  return (
    <div className="bg-white rounded-xl shadow-lg border">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📋 Semua Presensi Hari Ini</h2>
            <p className="text-gray-600">Riwayat lengkap semua presensi member dan non-member</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Total: {totalCheckins}
            </div>
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              Masuk: {currentCheckedIn.length}
            </div>
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fasilitas</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durasi</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{record.userName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(record.type)}`}>
                      {getTypeText(record.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{formatTime(record.checkInTime)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {record.checkOutTime ? formatTime(record.checkOutTime) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{record.facility || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {formatDuration(record.checkInTime, record.checkOutTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada data presensi hari ini</h3>
          <p className="text-gray-500">Data presensi akan muncul di sini setelah ada check-in</p>
        </div>
      )}
    </div>
  );
}