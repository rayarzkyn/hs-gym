'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import io from 'socket.io-client';
import Image from 'next/image';

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
  created_at: string;
  visits: any[];
  facility_activities: any[];
  total_visits: number;
  active_visit: boolean;
  manual_checkin: boolean;
  current_facility?: string;
  current_facility_name?: string;
}

interface UserData {
  username: string;
  nama: string;
  role: string;
  daily_code?: string;
}

interface Facility {
  id: string;
  name: string;
  capacity: number;
  currentUsage: number;
  currentMembers: number;
  status: 'available' | 'full' | 'maintenance' | 'cleaning';
  equipment: Array<{
    name: string;
    count: number;
    status: string;
  }>;
  peakHours: string[];
  lastMaintenance: string;
  nextMaintenance: string;
  activeMembers: Array<{
    id: string;
    name: string;
    checkinTime: string;
    type: string;
  }>;
}

export default function NonMemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [memberData, setMemberData] = useState<NonMemberData | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facilityLoading, setFacilityLoading] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [historyType, setHistoryType] = useState<'visits' | 'facilities'>('visits');
  const socketRef = useRef<any>(null);
  const [lastFacilityUpdate, setLastFacilityUpdate] = useState<Date>(new Date());

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('facility-update', (updatedFacility: Facility) => {
      console.log('🔄 Received facility update via WebSocket:', updatedFacility.name);
      setFacilities(prev => prev.map(f => 
        f.id === updatedFacility.id ? {
          ...updatedFacility,
          // **PERBAIKAN: Pastikan usage percentage dihitung dengan benar**
          usagePercentage: Math.round((updatedFacility.currentMembers / updatedFacility.capacity) * 100)
        } : f
      ));
      
      // Update current facility name if it's the current facility
      if (memberData?.current_facility === updatedFacility.id) {
        setMemberData(prev => prev ? {
          ...prev,
          current_facility_name: updatedFacility.name
        } : null);
      }
      
      setLastFacilityUpdate(new Date());
    });

    socketRef.current.on('nonmember-facility-change', (data: { 
      username: string, 
      facilityId: string, 
      facilityName: string,
      action: 'enter' | 'leave' | 'switch',
      currentMembers: number 
    }) => {
      if (memberData?.username === data.username) {
        console.log('📍 Non-member facility change:', data);
        
        // **PERBAIKAN: Update local state dengan benar**
        setFacilities(prev => prev.map(f => {
          if (f.id === data.facilityId) {
            return {
              ...f,
              currentMembers: data.currentMembers,
              usagePercentage: Math.round((data.currentMembers / f.capacity) * 100)
            };
          }
          return f;
        }));
        
        // Refresh member data jika action adalah 'leave'
        if (data.action === 'leave') {
          fetchMemberData(memberData.username);
        }
        
        setLastFacilityUpdate(new Date());
      }
    });

    socketRef.current.on('member-checkin', (data: { memberId: string, facilityId: string }) => {
      if (memberData?.username === data.memberId) {
        fetchMemberData(memberData.username);
      }
    });

    socketRef.current.on('member-checkout', (data: { memberId: string, facilityId: string }) => {
      if (memberData?.username === data.memberId) {
        fetchMemberData(memberData.username);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [memberData]);

  // Listen to Firestore real-time updates for facilities
  useEffect(() => {
    const facilitiesRef = collection(db, 'facilities');
    const q = query(facilitiesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔥 Firestore facilities update received');
      const facilitiesData: Facility[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        facilitiesData.push({
          id: doc.id,
          name: data.name || 'Unknown Facility',
          capacity: data.capacity || 0,
          currentUsage: data.currentUsage || 0,
          currentMembers: data.currentMembers || 0,
          status: data.status || 'available',
          equipment: data.equipment || [],
          peakHours: data.peakHours || [],
          lastMaintenance: data.lastMaintenance || '',
          nextMaintenance: data.nextMaintenance || '',
          activeMembers: data.activeMembers || []
        });
      });
      console.log('📊 Facilities updated:', facilitiesData.length);
      setFacilities(facilitiesData);
      setLastFacilityUpdate(new Date());
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('nonMemberUser');
    
    if (!userData) {
      router.push('/non-member-login');
      return;
    }

    try {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      // Reset auto checkin jika ada
      fetchMemberData(userObj.username, true);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/non-member-login');
    }
  }, [router]);

  // Check expired status whenever memberData changes
  useEffect(() => {
    if (memberData && memberData.expired_at) {
      try {
        const expiryDate = new Date(memberData.expired_at);
        const now = new Date();
        setIsExpired(now > expiryDate || memberData.status === 'expired');
      } catch (error) {
        console.error('Error checking expiration:', error);
        setIsExpired(true);
      }
    }
  }, [memberData]);

  // **PERBAIKAN: Fungsi untuk refresh facilities**
  const refreshFacilities = async () => {
    try {
      console.log('🔄 Manual refresh facilities...');
      const response = await fetch('/api/facilities?userType=non-member');
      const result = await response.json();
      if (result.success) {
        const updatedFacilities = result.data.map((facility: any) => ({
          ...facility,
          usagePercentage: Math.round((facility.currentMembers / facility.capacity) * 100)
        }));
        setFacilities(updatedFacilities);
        console.log('✅ Facilities refreshed:', updatedFacilities.length);
        setLastFacilityUpdate(new Date());
      }
    } catch (error) {
      console.error('Error refreshing facilities:', error);
    }
  };

  const fetchMemberData = async (username: string, resetAutoCheckin = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/non-member/data?username=${username}${
        resetAutoCheckin ? '&preventAutoCheckin=true' : ''
      }`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setMemberData(result.data);
        
        // **PERBAIKAN: Update current facility name from facilities list**
        if (result.data.current_facility) {
          const currentFacility = facilities.find(f => f.id === result.data.current_facility);
          if (currentFacility) {
            setMemberData(prev => prev ? {
              ...prev,
              current_facility_name: currentFacility.name
            } : null);
          }
        }
        
        // Check expiration
        if (result.data.expired_at) {
          const expiryDate = new Date(result.data.expired_at);
          const now = new Date();
          setIsExpired(now > expiryDate || result.data.status === 'expired');
        }
        
        // **PERBAIKAN: Refresh facilities setelah fetch member data**
        await refreshFacilities();
      } else {
        setError(result.error || 'Gagal memuat data');
        if (result.error?.includes('kadaluarsa') || result.error?.includes('tidak aktif')) {
          setIsExpired(true);
        }
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckin = async () => {
    if (!user) return;

    try {
      setFacilityLoading('daily');
      
      const response = await fetch('/api/non-member/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          action: 'checkin',
          manual_checkin: true // TANDAI sebagai manual
        }),
      });

      const result = await response.json();

      if (result.success) {
        // **PERBAIKAN: Refresh facilities setelah checkin**
        await refreshFacilities();
        
        alert(`✅ Check-in harian berhasil!`);
        fetchMemberData(user.username);
      } else {
        alert('❌ Gagal check-in: ' + result.error);
      }
    } catch (error) {
      console.error('Daily check-in error:', error);
      alert('❌ Terjadi kesalahan saat check-in');
    } finally {
      setFacilityLoading(null);
    }
  };

  const handleDailyCheckout = async () => {
    if (!user || !memberData) return;

    try {
      setFacilityLoading('daily');
      
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
        // **PERBAIKAN: Refresh facilities setelah checkout**
        await refreshFacilities();
        
        alert(`✅ Check-out harian berhasil!\n\n🚪 Anda telah keluar dari gym\n📊 Total kunjungan tetap: ${memberData.total_visits + 1}x`);
        fetchMemberData(user.username);
      } else {
        alert('❌ Gagal check-out: ' + result.error);
      }
    } catch (error) {
      console.error('Daily check-out error:', error);
      alert('❌ Terjadi kesalahan saat check-out');
    } finally {
      setFacilityLoading(null);
    }
  };

  const handleSelectFacility = async (facilityId: string) => {
    if (!user || !memberData) return;

    try {
      setFacilityLoading(facilityId);
      
      const response = await fetch('/api/non-member/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          action: 'select_facility',
          facilityId: facilityId
        }),
      });

      const result = await response.json();

      if (result.success) {
        // **PERBAIKAN: Dapatkan data fasilitas yang update**
        const facility = facilities.find(f => f.id === facilityId);
        const facilityName = facility?.name || 'Fasilitas';
        
        // **PERBAIKAN: Refresh facilities setelah select facility**
        await refreshFacilities();
        
        // **PERBAIKAN: Refresh member data untuk update current facility**
        fetchMemberData(user.username);
        
        if (result.data.is_visit === false) {
          alert(`✅ ${result.message}\n\n📍 ${facilityName}\n👥 ${result.data.current_members}/${result.data.capacity} orang\n📊 Penggunaan: ${result.data.usage_percentage}%\n\n💡 Catatan: Memilih fasilitas TIDAK menambah total kunjungan\nTotal kunjungan tetap: ${memberData.total_visits}x`);
        } else {
          alert(result.message);
        }
      } else {
        alert('❌ Gagal memilih fasilitas: ' + result.error);
      }
    } catch (error) {
      console.error('Facility selection error:', error);
      alert('❌ Terjadi kesalahan saat memilih fasilitas');
    } finally {
      setFacilityLoading(null);
    }
  };

  const handleLeaveFacility = async () => {
    if (!user || !memberData) return;

    if (!memberData.current_facility) {
      alert('⚠️ Anda tidak sedang menggunakan fasilitas');
      return;
    }

    try {
      setFacilityLoading(memberData.current_facility);
      
      const response = await fetch('/api/non-member/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          action: 'leave_facility'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // **PERBAIKAN: Refresh facilities setelah leave facility**
        await refreshFacilities();
        
        // **PERBAIKAN: Refresh member data untuk update current facility**
        fetchMemberData(user.username);
        
        alert(`✅ Berhasil keluar dari fasilitas!\n\n📊 Total kunjungan tetap: ${memberData.total_visits}x\n\n💡 Catatan: Keluar fasilitas TIDAK mengurangi total kunjungan`);
      } else {
        alert('❌ Gagal keluar dari fasilitas: ' + result.error);
      }
    } catch (error) {
      console.error('Leave facility error:', error);
      alert('❌ Terjadi kesalahan saat keluar dari fasilitas');
    } finally {
      setFacilityLoading(null);
    }
  };

  const getFacilityStatus = (facility: Facility) => {
    // **PERBAIKAN: Hitung usage percentage dengan benar**
    const usagePercentage = Math.round((facility.currentMembers / facility.capacity) * 100);
    
    if (facility.status === 'maintenance' || facility.status === 'cleaning') {
      return {
        label: facility.status === 'maintenance' ? 'Maintenance' : 'Pembersihan',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        textColor: 'text-gray-700',
        icon: facility.status === 'maintenance' ? '🔧' : '🧹'
      };
    }
    
    if (usagePercentage >= 90) {
      return {
        label: 'Penuh',
        color: 'bg-red-100 text-red-800 border-red-300',
        textColor: 'text-red-600',
        icon: '🔴'
      };
    } else if (usagePercentage >= 70) {
      return {
        label: 'Ramai',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        textColor: 'text-orange-600',
        icon: '🟠'
      };
    } else if (usagePercentage >= 40) {
      return {
        label: 'Sedang',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        textColor: 'text-yellow-600',
        icon: '🟡'
      };
    } else {
      return {
        label: 'Tersedia',
        color: 'bg-green-100 text-green-800 border-green-300',
        textColor: 'text-green-600',
        icon: '🟢'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('nonMemberUser');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Belum diatur';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        if (dateString.includes('T')) {
          return new Date(dateString).toLocaleString('id-ID');
        }
        return 'Tanggal tidak valid';
      }
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Tanggal tidak valid';
    }
  };

  const getRemainingTime = (expiredAt: string) => {
    try {
      if (!expiredAt) return 'Belum diatur';
      
      const now = new Date();
      const expiry = new Date(expiredAt);
      
      if (isNaN(expiry.getTime())) {
        if (memberData?.created_at) {
          const created = new Date(memberData.created_at);
          const newExpiry = new Date(created.getTime() + (24 * 60 * 60 * 1000));
          const diffMs = newExpiry.getTime() - now.getTime();
          
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
        }
        return 'Tanggal tidak valid';
      }
      
      const diffMs = expiry.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return 'Telah kadaluarsa';
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 24) {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} hari ${diffHours % 24} jam`;
      } else if (diffHours > 0) {
        return `${diffHours} jam ${diffMinutes} menit`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} menit`;
      } else {
        return 'Kurang dari 1 menit';
      }
    } catch (error) {
      return 'Error menghitung waktu';
    }
  };

  const handlePrintECard = () => {
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  // **PERBAIKAN: Tambahkan fungsi manual refresh facilities**
  const handleManualRefreshFacilities = async () => {
    try {
      await refreshFacilities();
      alert('✅ Fasilitas berhasil di-refresh!');
    } catch (error) {
      alert('❌ Gagal refresh fasilitas');
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
    { id: 'facilities', label: 'Fasilitas', icon: '🏋️' },
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

    const remainingTime = getRemainingTime(memberData.expired_at);
    const currentFacility = memberData.current_facility 
      ? facilities.find(f => f.id === memberData.current_facility)
      : null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className={`rounded-2xl p-6 text-white print:hidden ${
              isExpired ? 'bg-gradient-to-r from-red-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              <h1 className="text-2xl font-bold mb-2">
                {isExpired ? 'Daily Pass Kadaluarsa ⏰' : `Selamat Datang, ${memberData.nama}! 👋`}
              </h1>
              <p className="opacity-90">
                {isExpired 
                  ? 'Daily pass Anda telah kadaluarsa. Silakan beli lagi untuk akses gym.'
                  : `Semangat berolahraga hari ini! Total kunjungan: ${memberData.total_visits}x`
                }
              </p>
              <div className="mt-2 text-sm opacity-80">
                🕒 Terakhir update: {lastFacilityUpdate.toLocaleTimeString('id-ID')}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Status Pass</p>
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
                    <p className="text-gray-600 text-sm">Status Gym</p>
                    <p className={`text-2xl font-bold ${
                      memberData.active_visit ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {memberData.active_visit ? 'Dalam Gym' : 'Di Luar'}
                    </p>
                  </div>
                  <div className="text-3xl">{memberData.active_visit ? '🏃' : '🚶'}</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Total kunjungan: <span className="font-bold">{memberData.total_visits || 0}x</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (Hanya checkin harian)
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Fasilitas</p>
                    <p className={`text-2xl font-bold ${
                      memberData.current_facility ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {memberData.current_facility ? 'Aktif' : 'Tidak Aktif'}
                    </p>
                  </div>
                  <div className="text-3xl">{memberData.current_facility ? '📍' : '💤'}</div>
                </div>
                <p className="text-sm text-gray-600 mt-2 truncate">
                  {memberData.current_facility_name || 'Belum memilih fasilitas'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {memberData.current_facility ? 'Tidak menambah kunjungan' : '-'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Aktivitas Fasilitas</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {memberData.facility_activities?.length || 0}
                    </p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {memberData.facility_activities?.filter(a => a.status === 'active').length || 0} aktif
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (Tidak termasuk dalam kunjungan)
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {!isExpired && (
              <div className="bg-white rounded-xl p-6 shadow-lg border print:hidden">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {!memberData.active_visit ? (
                    <button
                      onClick={handleDailyCheckin}
                      disabled={facilityLoading === 'daily'}
                      className="bg-green-500 text-white py-4 px-6 rounded-lg hover:bg-green-600 transition font-semibold text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {facilityLoading === 'daily' ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <span>📝</span>
                      )}
                      <span>Check-in Gym</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDailyCheckout}
                      disabled={facilityLoading === 'daily'}
                      className="bg-orange-500 text-white py-4 px-6 rounded-lg hover:bg-orange-600 transition font-semibold text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {facilityLoading === 'daily' ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <span>🚪</span>
                      )}
                      <span>Check-out Gym</span>
                    </button>
                  )}
                  
                  {memberData.active_visit && !memberData.current_facility && (
                    <button 
                      onClick={() => setActiveTab('facilities')}
                      className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>📍</span>
                      <span>Pilih Fasilitas</span>
                    </button>
                  )}
                  
                  {memberData.current_facility && (
                    <button 
                      onClick={handleLeaveFacility}
                      disabled={facilityLoading === memberData.current_facility}
                      className="bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition font-semibold text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {facilityLoading === memberData.current_facility ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <span>🚪</span>
                      )}
                      <span>Keluar Fasilitas</span>
                    </button>
                  )}
                  
                  {memberData.active_visit && memberData.current_facility && (
                    <button 
                      onClick={() => setActiveTab('facilities')}
                      className="bg-purple-500 text-white py-4 px-6 rounded-lg hover:bg-purple-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>🔄</span>
                      <span>Ganti Fasilitas</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={handlePrintECard}
                    className="bg-indigo-500 text-white py-4 px-6 rounded-lg hover:bg-indigo-600 transition font-semibold text-lg flex items-center justify-center space-x-2 col-span-2 md:col-span-1"
                  >
                    <span>🖨️</span>
                    <span>Cetak E-Card</span>
                  </button>
                </div>
                
                {/* **PERBAIKAN: Tambahkan refresh button */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={handleManualRefreshFacilities}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm flex items-center space-x-2"
                    >
                      <span>🔄</span>
                      <span>Refresh Fasilitas</span>
                    </button>
                    <span className="text-xs text-gray-500">
                      Terakhir: {lastFacilityUpdate.toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Total Fasilitas: {facilities.length}
                  </div>
                </div>
                
                {/* Info Penting */}
                
              </div>
            )}

            {/* Current Facility Info */}
            {memberData.current_facility && currentFacility && (
              <div className="bg-white rounded-xl p-6 shadow-lg border print:hidden">
                <h2 className="text-xl font-bold mb-4">Fasilitas yang Sedang Digunakan</h2>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">{currentFacility.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
                            🟢 LIVE • {currentFacility.currentMembers}/{currentFacility.capacity} orang
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round((currentFacility.currentMembers / currentFacility.capacity) * 100)}% kapasitas
                          </span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          Anda masuk pada: {formatDate(
                            memberData.facility_activities?.find(a => 
                              a.facility_id === memberData.current_facility && a.status === 'active'
                            )?.checkin_time || new Date().toISOString()
                          )}
                        </p>
                      </div>
                      <div className="text-4xl">🏋️‍♂️</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Penggunaan Fasilitas</span>
                        <span className="font-semibold">
                          {Math.round((currentFacility.currentMembers / currentFacility.capacity) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full bg-green-500"
                          style={{ 
                            width: `${Math.min(
                              Math.round((currentFacility.currentMembers / currentFacility.capacity) * 100), 
                              100
                            )}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Active Members */}
                    {currentFacility.activeMembers && currentFacility.activeMembers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Sedang berolahraga ({currentFacility.activeMembers.length} orang):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentFacility.activeMembers.map((member, index) => (
                            <div 
                              key={index} 
                              className={`px-3 py-1.5 rounded-full text-sm ${
                                member.id === memberData.username 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {member.name}
                              {member.id === memberData.username && ' (Anda)'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={handleLeaveFacility}
                        disabled={facilityLoading === memberData.current_facility}
                        className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {facilityLoading === memberData.current_facility ? (
                          <>
                            <span className="animate-spin">⌛</span>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>🚪</span>
                            <span>Keluar dari Fasilitas Ini</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('facilities')}
                        className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center space-x-2"
                      >
                        <span>🔄</span>
                        <span>Ganti Fasilitas</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E-Card Display */}
            <div className="bg-white rounded-xl p-6 shadow-lg border print:border-0 print:shadow-none print:p-0">
              <h2 className="text-xl font-bold mb-4 print:hidden">E-Card Daily Pass</h2>
              <div id="e-card" className={`rounded-2xl p-6 text-white print:rounded-none print:p-8 print:min-h-[calc(100vh-2rem)] ${
                isExpired ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
              }`}>
                <div className="text-center mb-4 print:mb-6">
                  <div className="text-4xl mb-2 print:text-5xl">🎫</div>
                  <h3 className="text-2xl font-bold print:text-3xl">DAILY PASS</h3>
                  <p className="opacity-90 print:text-lg">HS Gym Rancakihiyang</p>
                  <p className="text-sm mt-1 print:text-base">
                    Total Kunjungan: {memberData.total_visits}x
                  </p>
                </div>
                
                <div className="space-y-3 text-sm print:space-y-4 print:text-base">
                  <div className="flex justify-between">
                    <span className="opacity-90">Kode:</span>
                    <span className="font-mono font-bold text-xl print:text-2xl">{memberData.daily_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Username:</span>
                    <span className="font-mono font-semibold print:text-lg">{memberData.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Nama:</span>
                    <span className="font-semibold print:text-lg">{memberData.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Berlaku hingga:</span>
                    <span className="font-semibold print:text-lg">{formatDate(memberData.expired_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-90">Total Kunjungan:</span>
                    <span className="font-semibold print:text-lg">{memberData.total_visits}x</span>
                  </div>
                  {memberData.current_facility_name && (
                    <div className="flex justify-between">
                      <span className="opacity-90">Fasilitas Aktif:</span>
                      <span className="font-semibold print:text-lg">{memberData.current_facility_name}</span>
                    </div>
                  )}
                </div>
                
                {/* QR Code Section */}
                <div className="mt-8 pt-6 border-t border-white/20 print:mt-12 print:pt-8">
                  <div className="text-center">
                    <p className="text-sm opacity-90 mb-2 print:text-base">Tunjukkan QR Code ini saat check-in</p>
                    <div className="inline-block bg-white p-2 rounded-lg print:p-3">
                      <div className="w-32 h-32 bg-gray-100 flex items-center justify-center print:w-40 print:h-40 relative">
                        <Image
                          src="/qris.jpg"
                          alt="QR Code Daily Pass"
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 128px) 100vw, 128px"
                        />
                      </div>
                    </div>
                    <p className="text-xs opacity-90 mt-2 print:text-sm">
                      Generated on: {new Date().toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'facilities':
        return (
          <div className="space-y-6 print:hidden">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Fasilitas Gym (Real-time)</h2>
                  <p className="text-gray-600">
                    {memberData.current_facility 
                      ? 'Anda bisa ganti fasilitas atau keluar dari fasilitas saat ini'
                      : 'Pilih fasilitas untuk berolahraga'
                    }
                  </p>
                  {memberData.current_facility && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <span className="text-xl">📍</span>
                        <span className="font-semibold">
                          Anda sedang di: {memberData.current_facility_name}
                        </span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        💡 Memilih/ganti fasilitas <span className="font-bold">TIDAK menambah total kunjungan</span>
                      </p>
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">Total Kunjungan Anda:</span> {memberData.total_visits}x 
                      (hanya dari checkin harian)
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Tersedia</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm">Ramai</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Penuh</span>
                  </div>
                  <button 
                    onClick={handleManualRefreshFacilities}
                    className="ml-4 bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition text-sm flex items-center space-x-1"
                  >
                    <span>🔄</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
              
              {/* **PERBAIKAN: Tambahkan status update */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">🔄</span>
                    <span className="text-sm text-green-800">
                      Data fasilitas real-time • Terakhir update: {lastFacilityUpdate.toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Total fasilitas: {facilities.length}
                  </span>
                </div>
              </div>
              
              {/* Facilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map(facility => {
                  const status = getFacilityStatus(facility);
                  // **PERBAIKAN: Hitung usage percentage dengan benar**
                  const usagePercentage = Math.round((facility.currentMembers / facility.capacity) * 100);
                  const isCurrentFacility = memberData.current_facility === facility.id;
                  const canSelect = !isExpired && 
                    memberData.active_visit && 
                    facility.status === 'available' &&
                    usagePercentage < 90;
                  
                  return (
                    <div 
                      key={facility.id} 
                      className={`rounded-xl border p-6 transition-all duration-300 ${
                        isCurrentFacility 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'bg-white hover:shadow-lg'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{facility.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                              {status.icon} {status.label} • LIVE
                            </span>
                            <span className="text-sm text-gray-600">
                              {facility.currentMembers}/{facility.capacity} orang
                            </span>
                          </div>
                          {/* **PERBAIKAN: Tampilkan progress persentase */}
                          <div className="mt-1 text-xs text-gray-500">
                            Penggunaan: {usagePercentage}%
                          </div>
                        </div>
                        <div className="text-3xl">
                          {facility.name.includes('Cardio') ? '🏃' : 
                           facility.name.includes('Weight') ? '🏋️' : 
                           facility.name.includes('Yoga') ? '🧘' : '🏋️‍♂️'}
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Penggunaan</span>
                          <span className="font-semibold">{usagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${status.textColor.replace('text-', 'bg-')}`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Active Members */}
                      {facility.activeMembers && facility.activeMembers.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">
                            Pengguna ({facility.activeMembers.length}):
                          </p>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {facility.activeMembers.map((member, index) => (
                              <div 
                                key={index} 
                                className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                  member.id === memberData.username 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <span className="truncate">{member.name}</span>
                                <span className="text-xs opacity-75">
                                  {member.id === memberData.username ? '(Anda)' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="mt-4 space-y-2">
                        {isCurrentFacility ? (
                          <>
                            <button
                              onClick={() => handleSelectFacility(facility.id)}
                              disabled={facilityLoading === facility.id}
                              className="w-full bg-green-500 text-white py-2.5 px-4 rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                              {facilityLoading === facility.id ? (
                                <>
                                  <span className="animate-spin">⌛</span>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <span>🔄</span>
                                  <span>Ganti ke Fasilitas Ini</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleLeaveFacility}
                              disabled={facilityLoading === facility.id}
                              className="w-full bg-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                              {facilityLoading === facility.id ? (
                                <>
                                  <span className="animate-spin">⌛</span>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <span>🚪</span>
                                  <span>Keluar dari Fasilitas</span>
                                </>
                              )}
                            </button>
                            <div className="text-xs text-center text-gray-500 mt-1">
                              💡 Tindakan ini <span className="font-bold">TIDAK</span> mempengaruhi total kunjungan
                            </div>
                          </>
                        ) : canSelect ? (
                          <>
                            <button
                              onClick={() => handleSelectFacility(facility.id)}
                              disabled={facilityLoading === facility.id}
                              className="w-full bg-blue-500 text-white py-2.5 px-4 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                              {facilityLoading === facility.id ? (
                                <>
                                  <span className="animate-spin">⌛</span>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <span>📍</span>
                                  <span>Pilih Fasilitas Ini</span>
                                </>
                              )}
                            </button>
                            <div className="text-xs text-center text-green-600 mt-1">
                              ✅ Aksi ini <span className="font-bold">TIDAK menambah</span> total kunjungan
                            </div>
                          </>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-gray-200 text-gray-500 py-2.5 px-4 rounded-lg cursor-not-allowed font-semibold"
                            title={
                              isExpired ? 'Daily pass telah kadaluarsa' :
                              !memberData.active_visit ? 'Belum check-in harian' :
                              facility.status !== 'available' ? `Fasilitas ${facility.status}` :
                              usagePercentage >= 90 ? 'Fasilitas penuh' :
                              'Pilih Fasilitas'
                            }
                          >
                            {isExpired ? 'Daily pass telah kadaluarsa' :
                             !memberData.active_visit ? 'Belum check-in harian' :
                             facility.status !== 'available' ? `Fasilitas ${facility.status}` :
                             usagePercentage >= 90 ? 'Fasilitas penuh' :
                             'Pilih Fasilitas'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {facilities.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏋️</div>
                  <p className="text-gray-500 text-lg">Tidak ada fasilitas yang tersedia</p>
                  <p className="text-gray-400">Coba filter lain atau refresh halaman</p>
                  <button 
                    onClick={handleManualRefreshFacilities}
                    className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
                  >
                    🔄 Refresh Fasilitas
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border print:hidden">
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
                <h3 className="text-lg font-semibold mb-4">Informasi Pass & Aktivitas</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Harga</label>
                    <p className="font-semibold">Rp {memberData.harga?.toLocaleString('id-ID') || '0'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status Pass</label>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                      isExpired 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired ? 'Kadaluarsa' : 'Aktif'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Total Kunjungan Gym</label>
                    <p className="font-semibold text-blue-600">{memberData.total_visits} kali</p>
                    <p className="text-xs text-gray-500">(hanya dari checkin harian)</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Aktivitas Fasilitas</label>
                    <p className="font-semibold text-purple-600">{memberData.facility_activities?.length || 0} kali</p>
                    <p className="text-xs text-gray-500">(tidak termasuk dalam kunjungan)</p>
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
          <div className="bg-white rounded-xl p-6 shadow-lg border print:hidden">
            <h2 className="text-2xl font-bold mb-6">Riwayat Aktivitas</h2>
            
            {/* Info Penting */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 text-lg">📊</span>
                <div>
                  <p className="text-blue-800 font-semibold">Sistem Penghitungan Kunjungan:</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• <span className="font-bold">Check-in harian</span> = <span className="font-bold text-green-600">+1 total kunjungan</span></li>
                    <li>• <span className="font-bold">Pilih/ganti fasilitas</span> = <span className="font-bold text-gray-600">TIDAK menambah kunjungan</span></li>
                    <li>• <span className="font-bold">Total kunjungan saat ini:</span> <span className="font-bold text-blue-600">{memberData.total_visits}x</span></li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Tab untuk kunjungan vs aktivitas fasilitas */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setHistoryType('visits')}
                className={`px-4 py-2 rounded-lg transition ${historyType === 'visits' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Kunjungan Gym ({memberData.total_visits || 0})
              </button>
              <button
                onClick={() => setHistoryType('facilities')}
                className={`px-4 py-2 rounded-lg transition ${historyType === 'facilities' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Aktivitas Fasilitas ({memberData.facility_activities?.length || 0})
              </button>
            </div>
            
            {historyType === 'visits' ? (
              // TAMPILKAN KUNJUNGAN GYM (HANYA yang login_type = 'non_member_daily')
              memberData.visits && memberData.visits.length > 0 ? (
                <div className="space-y-4">
                  {memberData.visits.map((visit, index) => (
                    <div key={visit.id || `visit-${index}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          visit.status === 'active' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <span className={`text-xl ${
                            visit.status === 'active' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {visit.login_type === 'non_member_daily' ? '🎫' : '📝'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold">Kunjungan Gym #{memberData.visits.length - index}</p>
                            {visit.manual_checkin && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Manual
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(visit.checkin_time)}
                            {visit.checkout_time && ` - ${formatDate(visit.checkout_time)}`}
                          </p>
                          {visit.duration && (
                            <p className="text-sm text-green-600 font-medium">
                              ⏱️ Durasi: {visit.duration}
                            </p>
                          )}
                          {visit.location && (
                            <p className="text-xs text-gray-500 mt-1">
                              📍 {visit.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                          visit.status === 'active' 
                            ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {visit.status === 'active' ? 'Sedang di Gym' : 'Selesai'}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          +1 Kunjungan
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 text-lg">Belum ada riwayat kunjungan</p>
                  <p className="text-gray-400">Lakukan check-in pertama Anda!</p>
                  {!isExpired && !memberData.active_visit && (
                    <button 
                      onClick={handleDailyCheckin}
                      disabled={facilityLoading === 'daily'}
                      className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50 flex items-center justify-center space-x-2 mx-auto"
                    >
                      {facilityLoading === 'daily' ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <span>📝</span>
                      )}
                      <span>Check-in Sekarang (+1 Kunjungan)</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              // TAMPILKAN AKTIVITAS FASILITAS
              memberData.facility_activities && memberData.facility_activities.length > 0 ? (
                <div className="space-y-4">
                  {memberData.facility_activities.map((activity, index) => (
                    <div key={activity.id || `activity-${index}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          activity.status === 'active' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <span className={`text-xl ${
                            activity.status === 'active' ? 'text-purple-600' : 'text-gray-600'
                          }`}>
                            {activity.activity_type === 'enter' ? '📍' : 
                             activity.activity_type === 'switch' ? '🔄' : '🏋️'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">
                            {activity.activity_type === 'enter' ? 'Masuk ke Fasilitas' : 
                             activity.activity_type === 'switch' ? 'Ganti Fasilitas' : 'Aktivitas Fasilitas'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {activity.facility_name || 'Fasilitas'}
                          </p>
                          <div className="text-sm text-gray-600">
                            <span>{formatDate(activity.checkin_time)}</span>
                            {activity.checkout_time && (
                              <span> - {formatDate(activity.checkout_time)}</span>
                            )}
                          </div>
                          {activity.previous_facility_name && (
                            <p className="text-xs text-blue-600 mt-1">
                              Dari: {activity.previous_facility_name}
                            </p>
                          )}
                          {activity.duration && activity.duration !== '0 menit' && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              ⏱️ Durasi: {activity.duration}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                          activity.status === 'active' 
                            ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status === 'active' ? 'Sedang digunakan' : 'Selesai'}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Tidak +Kunjungan
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏋️</div>
                  <p className="text-gray-500 text-lg">Belum ada aktivitas fasilitas</p>
                  <p className="text-gray-400">
                    {memberData.active_visit 
                      ? 'Pilih fasilitas untuk mulai berolahraga!' 
                      : 'Lakukan check-in terlebih dahulu untuk menggunakan fasilitas'
                    }
                  </p>
                  {memberData.active_visit && !memberData.current_facility && (
                    <button 
                      onClick={() => setActiveTab('facilities')}
                      className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center space-x-2 mx-auto"
                    >
                      <span>📍</span>
                      <span>Pilih Fasilitas (Tidak +Kunjungan)</span>
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
          }
          #e-card, #e-card * {
            visibility: visible;
          }
          #e-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40 print:hidden">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Daily Pass Dashboard</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
                <p className="text-xs text-blue-600 font-medium">
                  Total Kunjungan: {memberData?.total_visits || 0}x
                </p>
                <p className="text-xs text-gray-500">
                  🕒 Update: {lastFacilityUpdate.toLocaleTimeString('id-ID')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-gray-700 font-semibold truncate max-w-[200px]">{memberData?.nama || user.nama}</p>
                <p className="text-sm text-gray-600 truncate max-w-[200px]">
                  {memberData?.username || user.username}
                </p>
                <p className={`text-xs ${isExpired ? 'text-red-600' : 'text-green-600'} font-medium`}>
                  {memberData ? getRemainingTime(memberData.expired_at) : 'Loading...'}
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
      <div className="container mx-auto p-4 md:p-6 print:p-0">
        {/* Real-time Indicator */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg print:hidden">
          <span className="animate-pulse">●</span>
          <span>Connected - Data fasilitas real-time</span>
          <span className="ml-auto text-xs text-gray-500">
            Total Kunjungan: {memberData?.total_visits || 0}x • 
            Terakhir update: {lastFacilityUpdate.toLocaleTimeString('id-ID')}
          </span>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 print:hidden">
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