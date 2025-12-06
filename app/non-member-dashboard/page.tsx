'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; // Asumsi Anda sudah setup Firebase
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, getDoc, where, getDocs, addDoc } from 'firebase/firestore';
import io from 'socket.io-client';

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
  total_visits: number;
  active_visit: any;
  current_facility?: string;
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
  const socketRef = useRef<any>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('facility-update', (updatedFacility: Facility) => {
      setFacilities(prev => prev.map(f => 
        f.id === updatedFacility.id ? updatedFacility : f
      ));
    });

    socketRef.current.on('member-checkin', (data: { memberId: string, facilityId: string }) => {
      if (memberData?.username === data.memberId) {
        fetchMemberData(memberData.username);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Listen to Firestore real-time updates for facilities
  useEffect(() => {
    const facilitiesRef = collection(db, 'facilities');
    const q = query(facilitiesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
      setFacilities(facilitiesData);
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
      fetchMemberData(userObj.username);
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
        setIsExpired(now > expiryDate);
      } catch (error) {
        console.error('Error checking expiration:', error);
        setIsExpired(true);
      }
    }
  }, [memberData]);

  const fetchMemberData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/non-member/data?username=${username}`);
      const result = await response.json();

      if (result.success) {
        setMemberData(result.data);
        
        // Check expiration
        if (result.data.expired_at) {
          const expiryDate = new Date(result.data.expired_at);
          const now = new Date();
          setIsExpired(now > expiryDate);
        }
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
          action: 'checkin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Check-in harian berhasil!');
        fetchMemberData(user.username);
      } else {
        alert('Gagal check-in: ' + result.error);
      }
    } catch (error) {
      console.error('Daily check-in error:', error);
      alert('Terjadi kesalahan saat check-in');
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
        // If currently in a facility, check out from it first
        if (memberData.current_facility) {
          await handleFacilityCheckout(memberData.current_facility);
        }
        
        alert('Check-out berhasil!');
        fetchMemberData(user.username);
      } else {
        alert('Gagal check-out: ' + result.error);
      }
    } catch (error) {
      console.error('Daily check-out error:', error);
      alert('Terjadi kesalahan saat check-out');
    } finally {
      setFacilityLoading(null);
    }
  };

  const handleFacilityCheckin = async (facilityId: string) => {
    if (!user || !memberData) return;

    // Validasi
    if (isExpired) {
      alert('Daily pass Anda telah kadaluarsa! Silakan beli baru.');
      return;
    }

    if (!memberData.active_visit) {
      alert('Silakan check-in harian terlebih dahulu!');
      return;
    }

    if (memberData.current_facility && memberData.current_facility !== facilityId) {
      const currentFacilityName = facilities.find(f => f.id === memberData.current_facility)?.name || 'fasilitas lain';
      alert(`Anda sedang menggunakan ${currentFacilityName}. Silakan checkout terlebih dahulu.`);
      return;
    }

    try {
      setFacilityLoading(facilityId);
      
      const targetFacility = facilities.find(f => f.id === facilityId);
      if (!targetFacility) {
        alert('Fasilitas tidak ditemukan!');
        return;
      }

      if (targetFacility.status !== 'available') {
        alert(`Fasilitas sedang ${targetFacility.status === 'maintenance' ? 'maintenance' : 'dibersihkan'}. Tidak dapat digunakan.`);
        return;
      }

      const usagePercentage = (targetFacility.currentMembers / targetFacility.capacity) * 100;
      if (usagePercentage >= 90) {
        alert('Fasilitas sudah penuh! Silakan pilih fasilitas lain.');
        return;
      }

      // Update fasilitas di Firestore
      const facilityRef = doc(db, 'facilities', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      
      if (!facilitySnap.exists()) {
        alert('Data fasilitas tidak ditemukan!');
        return;
      }

      const facilityData = facilitySnap.data();
      
      // Cek apakah user sudah ada di fasilitas ini
      const isAlreadyInFacility = facilityData.activeMembers?.some(
        (member: any) => member.id === memberData.username
      );

      if (isAlreadyInFacility) {
        alert('Anda sudah check-in ke fasilitas ini!');
        return;
      }

      const newActiveMembers = [
        ...(facilityData.activeMembers || []),
        {
          id: memberData.username,
          name: memberData.nama,
          checkinTime: new Date().toISOString(),
          type: 'non-member-daily'
        }
      ];

      await updateDoc(facilityRef, {
        currentMembers: (facilityData.currentMembers || 0) + 1,
        currentUsage: Math.round(((facilityData.currentMembers || 0) + 1) / facilityData.capacity * 100),
        activeMembers: newActiveMembers,
        updatedAt: new Date().toISOString()
      });

      // Update non_members collection dengan current_facility
      const nonMembersRef = collection(db, 'non_members');
      const nonMemberQuery = query(nonMembersRef, where('username', '==', user.username));
      const nonMemberSnapshot = await getDocs(nonMemberQuery);
      
      if (!nonMemberSnapshot.empty) {
        const nonMemberDoc = nonMemberSnapshot.docs[0];
        await updateDoc(nonMemberDoc.ref, {
          current_facility: facilityId,
          last_checkin: new Date().toISOString(),
          updated_at: new Date()
        });
      }

      // Add facility visit record to non_member_visits
      await addDoc(collection(db, 'non_member_visits'), {
        username: memberData.username,
        daily_code: memberData.daily_code,
        nama: memberData.nama,
        facility_id: facilityId,
        facility_name: targetFacility.name,
        type: 'facility_checkin',
        status: 'active',
        checkin_time: new Date(),
        created_at: new Date()
      });

      // Kirim update via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('facility-checkin', {
          facilityId,
          memberId: memberData.username,
          memberName: memberData.nama,
          memberType: 'non-member-daily',
          timestamp: new Date().toISOString()
        });
      }
      
      alert(`Check-in ke ${targetFacility.name} berhasil!`);
      fetchMemberData(user.username);
      
    } catch (error) {
      console.error('Facility check-in error:', error);
      alert('Terjadi kesalahan saat check-in ke fasilitas');
    } finally {
      setFacilityLoading(null);
    }
  };

  const handleFacilityCheckout = async (facilityId: string) => {
    if (!user || !memberData) return;

    try {
      setFacilityLoading(facilityId);
      
      // Validasi: apakah user benar-benar di fasilitas ini
      if (memberData.current_facility !== facilityId) {
        alert('Anda tidak sedang menggunakan fasilitas ini!');
        return;
      }

      const facilityRef = doc(db, 'facilities', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const updatedActiveMembers = facilityData.activeMembers?.filter(
          (member: any) => member.id !== memberData.username
        ) || [];

        await updateDoc(facilityRef, {
          currentMembers: Math.max(0, (facilityData.currentMembers || 0) - 1),
          currentUsage: Math.round(Math.max(0, (facilityData.currentMembers || 0) - 1) / facilityData.capacity * 100),
          activeMembers: updatedActiveMembers,
          updatedAt: new Date().toISOString()
        });

        // Update non_members collection
        const nonMembersRef = collection(db, 'non_members');
        const nonMemberQuery = query(nonMembersRef, where('username', '==', user.username));
        const nonMemberSnapshot = await getDocs(nonMemberQuery);
        
        if (!nonMemberSnapshot.empty) {
          const nonMemberDoc = nonMemberSnapshot.docs[0];
          await updateDoc(nonMemberDoc.ref, {
            current_facility: null,
            updated_at: new Date()
          });
        }

        // Update facility visit record to completed
        const visitsRef = collection(db, 'non_member_visits');
        const activeVisitQuery = query(
          visitsRef,
          where('username', '==', user.username),
          where('facility_id', '==', facilityId),
          where('status', '==', 'active')
        );
        
        const activeVisitSnapshot = await getDocs(activeVisitQuery);
        
        if (!activeVisitSnapshot.empty) {
          const activeVisit = activeVisitSnapshot.docs[0];
          const checkinTime = activeVisit.data().checkin_time?.toDate?.() || activeVisit.data().checkin_time;
          const checkoutTime = new Date();
          const durationMs = checkoutTime.getTime() - checkinTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));

          await updateDoc(doc(db, 'non_member_visits', activeVisit.id), {
            status: 'completed',
            checkout_time: checkoutTime,
            duration: `${durationMinutes} menit`,
            updated_at: new Date()
          });
        }

        // Kirim update via WebSocket
        if (socketRef.current) {
          socketRef.current.emit('facility-checkout', {
            facilityId,
            memberId: memberData.username,
            timestamp: new Date().toISOString()
          });
        }

        alert(`Check-out dari fasilitas berhasil!`);
        fetchMemberData(user.username);
      } else {
        alert('Fasilitas tidak ditemukan!');
      }
    } catch (error) {
      console.error('Facility checkout error:', error);
      alert('Terjadi kesalahan saat check-out dari fasilitas');
    } finally {
      setFacilityLoading(null);
    }
  };

  const getFacilityStatus = (facility: Facility) => {
    const usagePercentage = (facility.currentMembers / facility.capacity) * 100;
    
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
      // Coba format lain
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
      minute: '2-digit'
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
      // Jika expired_at invalid, hitung 24 jam dari created_at
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Fasilitas Saat Ini</p>
                    <p className="text-2xl font-bold text-purple-600 truncate">
                      {memberData.current_facility 
                        ? facilities.find(f => f.id === memberData.current_facility)?.name || 'Fasilitas'
                        : 'Tidak ada'
                      }
                    </p>
                  </div>
                  <div className="text-3xl">{memberData.current_facility ? '📍' : '🏠'}</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {memberData.current_facility ? 'Sedang digunakan' : 'Belum memilih fasilitas'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {!isExpired && (
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <span>Check-in Harian</span>
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
                      <span>Check-out</span>
                    </button>
                  )}
                  
                  {memberData.active_visit && !memberData.current_facility && (
                    <button 
                      onClick={() => setActiveTab('facilities')}
                      className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                    >
                      <span>🏋️</span>
                      <span>Pilih Fasilitas</span>
                    </button>
                  )}
                  
                  {memberData.current_facility && (
                    <button 
                      onClick={() => handleFacilityCheckout(memberData.current_facility!)}
                      disabled={facilityLoading === memberData.current_facility}
                      className="bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition font-semibold text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {facilityLoading === memberData.current_facility ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <span>🚪</span>
                      )}
                      <span>Check-out Fasilitas</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => window.print()}
                    className="bg-purple-500 text-white py-4 px-6 rounded-lg hover:bg-purple-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <span>🖨️</span>
                    <span>Cetak E-Card</span>
                  </button>
                </div>
              </div>
            )}

            {/* Current Facility Info */}
            {memberData.current_facility && (
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <h2 className="text-xl font-bold mb-4">Fasilitas yang Digunakan</h2>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  {(() => {
                    const currentFacility = facilities.find(f => f.id === memberData.current_facility);
                    if (!currentFacility) return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Fasilitas tidak ditemukan</p>
                      </div>
                    );
                    
                    const status = getFacilityStatus(currentFacility);
                    const usagePercentage = Math.round((currentFacility.currentMembers / currentFacility.capacity) * 100);
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-800">{currentFacility.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
                                {status.icon} {status.label} • LIVE
                              </span>
                              <span className="text-sm text-gray-600">
                                {currentFacility.currentMembers}/{currentFacility.capacity} orang • {usagePercentage}% kapasitas
                              </span>
                            </div>
                          </div>
                          <div className="text-4xl">🏋️‍♂️</div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Penggunaan Fasilitas</span>
                            <span className="font-semibold">{usagePercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${status.textColor.replace('text-', 'bg-')}`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Active Members */}
                        {currentFacility.activeMembers && currentFacility.activeMembers.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">Sedang berolahraga:</p>
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
                      </div>
                    );
                  })()}
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
              </div>
            </div>
          </div>
        );

      case 'facilities':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Fasilitas Gym</h2>
                  <p className="text-gray-600">Pilih fasilitas yang ingin digunakan (Real-time)</p>
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
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-sm">Maintenance</span>
                  </div>
                </div>
              </div>
              
              {/* Filter Options */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button 
                  onClick={() => fetchMemberData(user.username).then(() => {
                    const facilitiesRef = collection(db, 'facilities');
                    const q = query(facilitiesRef);
                    getDocs(q).then(snapshot => {
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
                      setFacilities(facilitiesData);
                    });
                  })}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                >
                  Semua
                </button>
                <button 
                  onClick={() => {
                    const available = facilities.filter(f => 
                      (f.currentMembers / f.capacity) < 0.7 && 
                      f.status === 'available'
                    );
                    setFacilities([...available]);
                  }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                >
                  Tersedia
                </button>
                <button 
                  onClick={() => {
                    const busy = facilities.filter(f => 
                      (f.currentMembers / f.capacity) >= 0.7 && 
                      (f.currentMembers / f.capacity) < 0.9
                    );
                    setFacilities([...busy]);
                  }}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
                >
                  Ramai
                </button>
                <button 
                  onClick={() => {
                    const full = facilities.filter(f => 
                      (f.currentMembers / f.capacity) >= 0.9
                    );
                    setFacilities([...full]);
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  Penuh
                </button>
              </div>
              
              {/* Facilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map(facility => {
                  const status = getFacilityStatus(facility);
                  const usagePercentage = Math.round((facility.currentMembers / facility.capacity) * 100);
                  const isUsingFacility = memberData.current_facility === facility.id;
                  const canCheckin = !isExpired && 
                    memberData.active_visit && 
                    !memberData.current_facility &&
                    facility.status === 'available' &&
                    usagePercentage < 90;
                  
                  return (
                    <div 
                      key={facility.id} 
                      className={`rounded-xl border p-6 transition-all duration-300 ${
                        isUsingFacility 
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
                              {facility.currentMembers}/{facility.capacity} orang • {usagePercentage}% kapasitas
                            </span>
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
                          <span className="text-gray-600">Tingkat Penggunaan</span>
                          <span className="font-semibold">{usagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${status.textColor.replace('text-', 'bg-')}`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Equipment List */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Equipment:</p>
                        <div className="flex flex-wrap gap-2">
                          {facility.equipment.slice(0, 3).map((eq, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {eq.name} ({eq.count})
                            </span>
                          ))}
                          {facility.equipment.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              +{facility.equipment.length - 3} lagi
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Peak Hours */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          🕐 Jam sibuk: {facility.peakHours.join(', ')}
                        </p>
                      </div>
                      
                      {/* Active Members */}
                      {facility.activeMembers && facility.activeMembers.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">
                            {facility.currentMembers} orang sedang berolahraga
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {facility.activeMembers.slice(0, 3).map((member, index) => (
                              <span 
                                key={index} 
                                className="text-xs px-2 py-0.5 bg-gray-100 rounded"
                              >
                                {member.name}
                              </span>
                            ))}
                            {facility.activeMembers.length > 3 && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                +{facility.activeMembers.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Maintenance Info */}
                      <div className="text-xs text-gray-500 mb-4">
                        Maintenance terakhir: {facility.lastMaintenance} • 
                        Next: {facility.nextMaintenance}
                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-4">
                        {isUsingFacility ? (
                          <button
                            onClick={() => handleFacilityCheckout(facility.id)}
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
                                <span>Check-out dari Fasilitas Ini</span>
                              </>
                            )}
                          </button>
                        ) : canCheckin ? (
                          <button
                            onClick={() => handleFacilityCheckin(facility.id)}
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
                                <span>📝</span>
                                <span>Check-in ke Fasilitas Ini</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-gray-200 text-gray-500 py-2.5 px-4 rounded-lg cursor-not-allowed font-semibold"
                            title={
                              isExpired ? 'Daily pass telah kadaluarsa' :
                              !memberData.active_visit ? 'Belum check-in harian' :
                              memberData.current_facility ? 'Sedang menggunakan fasilitas lain' :
                              facility.status !== 'available' ? `Fasilitas ${facility.status}` :
                              usagePercentage >= 90 ? 'Fasilitas penuh' :
                              'Tidak dapat check-in'
                            }
                          >
                            {isExpired ? 'Daily pass telah kadaluarsa' :
                             !memberData.active_visit ? 'Belum check-in harian' :
                             memberData.current_facility ? 'Sedang menggunakan fasilitas lain' :
                             facility.status !== 'available' ? `Fasilitas ${facility.status}` :
                             usagePercentage >= 90 ? 'Fasilitas penuh' :
                             'Tidak dapat check-in'}
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
                </div>
              )}
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
                          {visit.facility_name || 'Gym Area'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(visit.checkin_time)}
                          {visit.checkout_time && ` - ${formatDate(visit.checkout_time)}`}
                        </p>
                        {visit.duration && (
                          <p className="text-sm text-gray-500">Durasi: {visit.duration}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          {visit.type === 'facility_checkin' ? 'Fasilitas' : 'Area Utama'}
                        </p>
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
                    onClick={handleDailyCheckin}
                    disabled={facilityLoading === 'daily'}
                    className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50"
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
        {/* Real-time Indicator */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
          <span className="animate-pulse">●</span>
          <span>Connected - Data fasilitas real-time</span>
          <span className="ml-auto text-xs text-gray-500">
            Terakhir update: {new Date().toLocaleTimeString('id-ID')}
          </span>
        </div>
        
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