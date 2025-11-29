'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NonMemberData {
  daily_code: string;
  username: string;
  nama: string;
  email: string;
  telepon: string;
  harga: number;
  status: string;
  tanggal_daftar: string;
  expired_at: string;
  visits: any[];
  total_visits: number;
  active_visit: any;
}

interface UserData {
  username: string;
  nama: string;
  role: string;
  daily_code?: string;
}

export default function NonMemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [memberData, setMemberData] = useState<NonMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const userData = localStorage.getItem('nonMemberUser');
    
    if (!userData) {
      router.push('/non-member-login');
      return;
    }

    try {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      fetchMemberData(userObj.username); // Menggunakan username bukan daily_code
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/non-member-login');
    }
  }, [router]);

  const fetchMemberData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/non-member/data?username=${username}`);
      const result = await response.json();

      if (result.success) {
        setMemberData(result.data);
      } else {
        setError(result.error || 'Gagal memuat data');
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/non-member/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          action: 'checkin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Check-in berhasil!');
        fetchMemberData(user.username);
      } else {
        alert('Gagal check-in: ' + result.error);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Terjadi kesalahan saat check-in');
    }
  };

  const handleCheckout = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/non-member/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          action: 'checkout'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Check-out berhasil!');
        fetchMemberData(user.username);
      } else {
        alert('Gagal check-out: ' + result.error);
      }
    } catch (error) {
      console.error('Check-out error:', error);
      alert('Terjadi kesalahan saat check-out');
    }
  };

  const logout = () => {
    localStorage.removeItem('nonMemberUser');
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRemainingTime = (expiredAt: string) => {
    try {
      const now = new Date();
      const expiry = new Date(expiredAt);
      
      if (isNaN(expiry.getTime())) {
        return 'Invalid Date';
      }
      
      const diffMs = expiry.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return 'Telah kadaluarsa';
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours} jam ${diffMinutes} menit`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} menit`;
      } else {
        return 'Kurang dari 1 menit';
      }
    } catch (error) {
      return 'Error calculating time';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Akses Ditolak</div>
          <p className="text-gray-600 mb-4">Silakan login terlebih dahulu</p>
          <button 
            onClick={() => router.push('/non-member-login')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'history', label: 'Riwayat', icon: '📊' },
  ];

  const renderTabContent = () => {
    if (!memberData) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Data tidak tersedia</div>
          <button 
            onClick={() => fetchMemberData(user.username)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            🔄 Refresh Data
          </button>
        </div>
      );
    }

    const isExpired = new Date() > new Date(memberData.expired_at);
    const remainingTime = getRemainingTime(memberData.expired_at);

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className={`rounded-2xl p-6 text-white ${
              isExpired ? 'bg-gradient-to-r from-red-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              <h1 className="text-2xl font-bold mb-2">
                {isExpired ? 'Daily Pass Kadaluarsa ⏰' : `Selamat Datang, ${memberData.nama}! 👋`}
              </h1>
              <p className="opacity-90">
                {isExpired 
                  ? 'Daily pass Anda telah kadaluarsa. Silakan beli lagi untuk akses gym.'
                  : 'Semangat berolahraga hari ini!'
                }
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <p className={`text-2xl font-bold ${
                      isExpired ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {isExpired ? 'Kadaluarsa' : 'Aktif'}
                    </p>
                  </div>
                  <div className="text-3xl">{isExpired ? '⏰' : '✅'}</div>
                </div>
                {!isExpired && (
                  <p className="text-sm text-gray-600 mt-2">
                    Sisa waktu: {remainingTime}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Kunjungan</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {memberData.total_visits || 0}x
                    </p>
                  </div>
                  <div className="text-3xl">🏋️</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {memberData.active_visit ? 'Sedang check-in' : 'Belum check-in'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {!isExpired && (
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!memberData.active_visit ? (
                    <button
                      onClick={handleCheckin}
                      className="bg-green-500 text-white py-4 px-6 rounded-lg hover:bg-green-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>📝</span>
                      <span>Check-in Sekarang</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      className="bg-orange-500 text-white py-4 px-6 rounded-lg hover:bg-orange-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>🚪</span>
                      <span>Check-out</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => window.print()}
                    className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <span>🖨️</span>
                    <span>Cetak E-Card</span>
                  </button>
                </div>
              </div>
            )}

            {/* E-Card Display */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">E-Card Daily Pass</h2>
              <div className={`rounded-2xl p-6 text-white ${
                isExpired ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
              }`}>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎫</div>
                  <h3 className="text-2xl font-bold">DAILY PASS</h3>
                  <p className="opacity-90">HS Gym Rancakihiyang</p>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-90">Kode:</span>
                    <span className="font-mono font-bold text-xl">{memberData.daily_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Username:</span>
                    <span className="font-mono font-semibold">{memberData.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Nama:</span>
                    <span className="font-semibold">{memberData.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Berlaku hingga:</span>
                    <span className="font-semibold">{formatDate(memberData.expired_at)}</span>
                  </div>
                </div>

                {/* QR Code Placeholder */}
                <div className="mt-4 bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-green-200 text-sm mb-2">Tunjukkan e-card ini di reception</div>
                  <div className="bg-white p-3 rounded inline-block">
                    <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-gray-600 text-xs">
                      <div className="text-center">
                        <div className="font-mono font-bold text-lg mb-1">{memberData.daily_code}</div>
                        <div className="text-xs">SCAN ME</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold mb-6">Profile Daily Pass</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Informasi Pribadi</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Kode Daily Pass</label>
                    <p className="font-mono font-semibold text-blue-600">{memberData.daily_code}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Username</label>
                    <p className="font-mono font-semibold text-green-600">{memberData.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nama Lengkap</label>
                    <p className="font-semibold">{memberData.nama}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-semibold">{memberData.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Telepon</label>
                    <p className="font-semibold">{memberData.telepon}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Informasi Pass</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Harga</label>
                    <p className="font-semibold">Rp {memberData.harga?.toLocaleString('id-ID') || '0'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                      isExpired 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired ? 'Kadaluarsa' : 'Aktif'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Tanggal Daftar</label>
                    <p className="font-semibold">{formatDate(memberData.tanggal_daftar)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Kadaluarsa</label>
                    <p className="font-semibold">{formatDate(memberData.expired_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Sisa Waktu</label>
                    <p className={`font-semibold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                      {isExpired ? 'Telah kadaluarsa' : remainingTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold mb-6">Riwayat Kunjungan</h2>
            {memberData.visits && memberData.visits.length > 0 ? (
              <div className="space-y-4">
                {memberData.visits.map((visit, index) => (
                  <div key={visit.id || `visit-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        visit.status === 'active' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-xl ${
                          visit.status === 'active' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {visit.status === 'active' ? '🏃' : '✅'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">
                          {visit.status === 'active' ? 'Sedang Check-in' : 'Kunjungan Selesai'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(visit.checkin_time)}
                        </p>
                        {visit.duration && (
                          <p className="text-sm text-gray-500">Durasi: {visit.duration}</p>
                        )}
                        {visit.location && (
                          <p className="text-sm text-gray-500">Lokasi: {visit.location}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      visit.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {visit.status === 'active' ? 'Aktif' : 'Selesai'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg">Belum ada riwayat kunjungan</p>
                <p className="text-gray-400">Lakukan check-in pertama Anda!</p>
                {!isExpired && (
                  <button 
                    onClick={handleCheckin}
                    className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold"
                  >
                    📝 Check-in Sekarang
                  </button>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Daily Pass Dashboard</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-gray-700 font-semibold truncate max-w-[200px]">{memberData?.nama || user.nama}</p>
                <p className="text-sm text-gray-600 truncate max-w-[200px]">
                  {memberData?.username || user.username} • {memberData ? getRemainingTime(memberData.expired_at) : 'Loading...'}
                </p>
              </div>
              <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600">⚠️</div>
              <div className="ml-3">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {renderTabContent()}
      </div>
    </div>
  );
}