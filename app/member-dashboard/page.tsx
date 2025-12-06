// app/member-dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import komponen-komponen
import AttendanceHistory from './components/AttendanceHistory';
import FacilityStatus from './components/FacilityStatus';
import MemberDashboardStats from './components/MemberDashboardStats';
import MembershipInfo from './components/MembershipInfo';

// 🔥 Custom Hook untuk SSE
// 🔥 PERBAIKAN: SSE Hook dengan error handling
function useFacilitiesStream(userType: string) {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;
    
    const connectSSE = () => {
      try {
        if (!isMounted) return;
        
        console.log(`🔗 Connecting SSE for ${userType}...`);
        
        // 🔥 PERBAIKAN: Tambahkan cache busting
        eventSource = new EventSource(`/api/facilities/stream?userType=${userType}&_t=${Date.now()}`);
        
        eventSource.onopen = () => {
          if (!isMounted) return;
          console.log(`✅ SSE Connected for ${userType}`);
          setConnected(true);
          setError(null);
        };
        
        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'update') {
              console.log(`📦 Received ${data.data.length} facilities via SSE`);
              setFacilities(data.data);
              setLastUpdate(new Date(data.timestamp));
            } else if (data.type === 'connected') {
              console.log(`📡 ${data.message}`);
            } else if (data.type === 'error') {
              console.error('SSE Server Error:', data.error);
              setError(data.error);
            }
          } catch (error) {
            console.error('❌ Error parsing SSE data:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          if (!isMounted) return;
          
          console.log(`⚠️ SSE Connection Error for ${userType}, will reconnect`);
          setConnected(false);
          setError('Connection lost. Reconnecting...');
          
          // Close existing connection
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // 🔥 PERBAIKAN: Tunggu 3 detik sebelum reconnect
          setTimeout(() => {
            if (isMounted) {
              console.log('🔄 Attempting to reconnect SSE...');
              connectSSE();
            }
          }, 3000);
        };
      } catch (error) {
        console.error('❌ Failed to create SSE connection:', error);
        if (isMounted) {
          setError('Failed to connect to server');
        }
      }
    };
    
    connectSSE();
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up SSE connection');
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userType]);
  
  return { facilities, lastUpdate, connected, error };
}

interface MemberData {
  id: string;
  nomor_member: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  tanggal_daftar: string | Date;
  masa_aktif: string | Date;
  status: string;
  membership_type: string;
  membership_plan: string;
  membership_price: number;
  sisa_hari: number;
  total_kunjungan: number;
  kunjungan_bulan_ini: number;
  riwayat_transaksi: any[];
  riwayat_kunjungan: any[];
}

interface Facility {
  id: string;
  name: string;
  status: string;
  capacity: number;
  currentMembers: number;
  currentUsage: number;
  equipment: Array<{
    name: string;
    count: number;
    status: string;
  }>;
  peakHours: string[];
  lastMaintenance: string;
  nextMaintenance: string;
  statusText?: string;
  statusColor?: string;
  isAvailable?: boolean;
  usagePercentage?: number;
  displayStatus?: string;
}

interface AttendanceHistory {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  facility: string | null;
  duration: string | null;
  status: string;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  paymentMethod: string;
}

export default function MemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [currentFacility, setCurrentFacility] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  
  // State untuk tab-tab lain
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 🔥 Gunakan SSE Hook untuk real-time facilities
  const { 
    facilities: streamFacilities, 
    lastUpdate: streamLastUpdate,
    connected: streamConnected,
    error: streamError 
  } = useFacilitiesStream('member');

  // 🔥 Update facilities data dari SSE
  useEffect(() => {
    if (streamFacilities.length > 0) {
      console.log('🔄 Updating facilities from SSE:', streamFacilities.length);
      setFacilities(streamFacilities);
    }
  }, [streamFacilities]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'member') {
      router.push('/login');
      return;
    }
    
    setUser(userObj);
    fetchMemberData(userObj.username);
    checkTodayAttendance(userObj.username);
  }, [router]);

useEffect(() => {
  // Hanya atur loading state, data sudah diambil di fetchMemberData
  if ((activeTab === 'history' && attendanceHistory.length === 0) || 
      (activeTab === 'payment' && transactions.length === 0)) {
    setHistoryLoading(true);
  } else {
    setHistoryLoading(false);
  }
}, [activeTab, attendanceHistory.length, transactions.length]);
  const checkTodayAttendance = async (username: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance/today?userId=${username}&date=${today}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setIsCheckedInToday(result.data.status === 'checked_in');
          setCurrentFacility(result.data.facility || null);
          setAttendanceId(result.data.id || null);
        }
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const fetchMemberData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching member data for:', username);
      
      const response = await fetch(`/api/member/data?memberId=${username}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Gagal memuat data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Member data received:', result.data.nama);
        
        setMemberData(result.data);
        
        // 🔥 PERBAIKAN 1: Ambil riwayat kunjungan dari data API
        if (result.data.riwayat_kunjungan && Array.isArray(result.data.riwayat_kunjungan)) {
          const formattedAttendanceHistory = result.data.riwayat_kunjungan.map((visit: any) => {
            // Format data dari API ke format yang diharapkan komponen
            const visitDate = visit.tanggal ? (visit.tanggal.toDate ? visit.tanggal.toDate() : new Date(visit.tanggal)) : new Date();
            
            return {
              id: visit.id || `visit_${Date.now()}_${Math.random()}`,
              date: visitDate.toISOString().split('T')[0],
              checkInTime: visit.waktu || visitDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              checkOutTime: null,
              facility: visit.facility || visit.area || 'Gym Area',
              duration: visit.durasi || '2 jam',
              status: visit.status || 'checked_out'
            };
          });
          
          console.log('📋 Formatted attendance history:', formattedAttendanceHistory.length, 'items');
          setAttendanceHistory(formattedAttendanceHistory);
        }
        
        // 🔥 PERBAIKAN 2: Ambil riwayat transaksi dari data API
        if (result.data.riwayat_transaksi && Array.isArray(result.data.riwayat_transaksi)) {
          const formattedTransactions = result.data.riwayat_transaksi.map((transaction: any) => {
            const transDate = transaction.tanggal ? 
              (transaction.tanggal.toDate ? transaction.tanggal.toDate() : new Date(transaction.tanggal)) : 
              new Date();
            
            return {
              id: transaction.id || `trans_${Date.now()}_${Math.random()}`,
              date: transDate.toISOString().split('T')[0],
              type: transaction.jenis || 'Membership Payment',
              description: transaction.paket || `Pembayaran ${transaction.jenis || 'membership'}`,
              amount: transaction.jumlah || transaction.amount || 0,
              status: transaction.status || 'completed',
              paymentMethod: transaction.metode_pembayaran || transaction.payment_method || 'Transfer'
            };
          });
          
          console.log('💳 Formatted transactions:', formattedTransactions.length, 'items');
          setTransactions(formattedTransactions);
        }
        
      } else {
        setError(result.error || 'Gagal memuat data member');
      }
    } catch (error) {
      console.error('❌ Error fetching member data:', error);
      setError('Terjadi kesalahan saat memuat data member. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckin = async () => {
    if (!user || !memberData) return;

    try {
      setCheckinLoading(true);
      
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.username,
          userName: memberData.nama,
          type: 'member'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Check-in harian berhasil! Sekarang Anda bisa memilih fasilitas.');
        setIsCheckedInToday(true);
        setAttendanceId(result.data?.id || null);
      } else {
        alert('Gagal check-in: ' + result.error);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Terjadi kesalahan saat check-in. Silakan coba lagi.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleSelectFacility = async (facilityId: string, facilityName: string) => {
    if (!user || !attendanceId) return;

    try {
      setCheckinLoading(true);
      
      const response = await fetch('/api/attendance/select-facility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceId: attendanceId,
          facility: facilityName,
          userId: user.username
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Berhasil memilih ${facilityName}! Selamat berolahraga 🏋️‍♂️`);
        setCurrentFacility(facilityName);
        setShowFacilityModal(false);
        
        console.log('✅ Facility selected, waiting for SSE update...');
      } else {
        alert('Gagal memilih fasilitas: ' + result.error);
      }
    } catch (error) {
      console.error('Select facility error:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckout = async () => {
  if (!user || !attendanceId) return;

  try {
    const response = await fetch('/api/attendance/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attendanceId: attendanceId,
        userId: user.username
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert('✅ Check-out berhasil! Sampai jumpa besok! 👋');
      setIsCheckedInToday(false);
      setCurrentFacility(null);
      setAttendanceId(null);
      
      // 🔥 FORCE REFRESH FACILITIES DATA
      setTimeout(() => {
        fetch('/api/facilities?userType=member')
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              setFacilities(result.data);
              console.log('🔄 Facilities manually refreshed after checkout');
            }
          });
      }, 1000);
    } else {
      alert('Gagal check-out: ' + result.error);
    }
  } catch (error) {
    console.error('Check-out error:', error);
    alert('Terjadi kesalahan saat check-out.');
  }
};

  const handleExtendMembership = async (plan: string) => {
    if (!user || !memberData) {
      alert('Data member tidak ditemukan');
      return;
    }

    const planPrices: any = {
      'Bulanan': 120000,
      'Triwulan': 300000,
      'Semester': 550000,
      'Tahunan': 1000000
    };

    const price = planPrices[plan] || 120000;

    if (!confirm(`Anda akan memperpanjang membership ${plan} seharga ${formatCurrency(price)}. Lanjutkan?`)) {
      return;
    }

    try {
      const response = await fetch('/api/member/extend-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: user.username,
          plan: plan,
          price: price,
          paymentMethod: 'transfer'
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Permintaan perpanjangan berhasil! Silakan lakukan pembayaran.');
        // Refresh data member
        fetchMemberData(user.username);
        setActiveTab('payment');
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      console.error('Extend membership error:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  const getCapacityStatus = (facility: Facility) => {
    if (facility.statusText) {
      const colorMap: Record<string, any> = {
        'Sejuk': { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
        'Sedang': { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
        'Ramai': { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
        'Penuh': { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
        'Maintenance': { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100' }
      };
      
      const statusConfig = colorMap[facility.statusText] || colorMap['Sejuk'];
      return {
        text: facility.statusText,
        color: statusConfig.color,
        textColor: statusConfig.textColor,
        bgColor: statusConfig.bgColor
      };
    }
    
    const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
    
    if (facility.status === 'maintenance') {
      return { 
        text: 'Maintenance', 
        color: 'bg-gray-500', 
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    }
    
    if (usagePercentage >= 90) {
      return { 
        text: 'Penuh', 
        color: 'bg-red-500', 
        textColor: 'text-red-700',
        bgColor: 'bg-red-50'
      };
    } else if (usagePercentage >= 70) {
      return { 
        text: 'Ramai', 
        color: 'bg-yellow-500', 
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50'
      };
    } else if (usagePercentage >= 40) {
      return { 
        text: 'Sedang', 
        color: 'bg-blue-500', 
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50'
      };
    } else {
      return { 
        text: 'Sejuk', 
        color: 'bg-green-500', 
        textColor: 'text-green-700',
        bgColor: 'bg-green-50'
      };
    }
  };

  const getMembershipPlanInfo = (plan: string) => {
    const plans: any = {
      'Bulanan': { color: 'from-blue-500 to-cyan-500', price: 120000, duration: '1 bulan' },
      'Triwulan': { color: 'from-purple-500 to-pink-500', price: 300000, duration: '3 bulan' },
      'Semester': { color: 'from-green-500 to-emerald-500', price: 550000, duration: '6 bulan' },
      'Tahunan': { color: 'from-orange-500 to-red-500', price: 1000000, duration: '12 bulan' }
    };
    return plans[plan] || plans['Bulanan'];
  };

  const getRemainingDaysText = (days: number): string => {
    if (days === 0) return 'Habis';
    if (days === 1) return '1 hari';
    if (days < 7) return `${days} hari`;
    if (days < 30) return `${Math.ceil(days / 7)} minggu`;
    return `${Math.ceil(days / 30)} bulan`;
  };

  const formatDate = (dateInput: string | Date) => {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Tanggal tidak valid';
    }
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateInput: string | Date) => {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Waktu tidak valid';
    }
    
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'checked_out':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'checked_in':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const renderFacilityModal = () => {
    if (!showFacilityModal) return null;

    const availableFacilities = facilities.filter(f => f.isAvailable !== false && f.status !== 'maintenance');
    const fullFacilities = facilities.filter(f => f.statusText === 'Penuh');
    const maintenanceFacilities = facilities.filter(f => f.status === 'maintenance');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Pilih Fasilitas</h2>
              <button
                onClick={() => setShowFacilityModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Tersedia</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm">Ramai</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">Penuh</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  <span className="text-sm">Maintenance</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Update: {streamLastUpdate.toLocaleTimeString('id-ID')}
                {streamError && <span className="text-red-500 ml-2">⚠️</span>}
              </div>
            </div>

            {availableFacilities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-green-600">
                  ✅ Fasilitas Tersedia ({availableFacilities.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableFacilities.map((facility) => {
                    const capacityStatus = getCapacityStatus(facility);
                    const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
                    
                    return (
                      <div key={facility.id} className="border rounded-xl p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-bold text-lg">{facility.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${capacityStatus.textColor} ${capacityStatus.color.replace('bg-', 'bg-')} bg-opacity-20`}>
                                LIVE
                              </span>
                            </div>
                            <p className="text-gray-600">
                              {facility.currentMembers}/{facility.capacity} orang • {capacityStatus.text}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${capacityStatus.color}`}>
                            {usagePercentage}%
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Kapasitas</span>
                            <span>Real-time</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${capacityStatus.color}`}
                              style={{ width: `${usagePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">🕐 Jam sibuk:</span>{' '}
                          {facility.peakHours.join(', ')}
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Equipment:</p>
                          <div className="flex flex-wrap gap-2">
                            {facility.equipment.slice(0, 3).map((eq, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {eq.name} ({eq.count} unit)
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-4">
                          Maintenance terakhir: {formatDate(facility.lastMaintenance)} • 
                          Next: {formatDate(facility.nextMaintenance)}
                        </div>
                        
                        <button
                          onClick={() => handleSelectFacility(facility.id, facility.name)}
                          disabled={checkinLoading}
                          className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50"
                        >
                          {checkinLoading ? 'Memproses...' : `Pilih ${facility.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {fullFacilities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-red-600">
                  ⚠️ Fasilitas Penuh ({fullFacilities.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fullFacilities.map((facility) => {
                    const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
                    
                    return (
                      <div key={facility.id} className="border rounded-xl p-4 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-bold text-lg">{facility.name}</h4>
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                PENUH
                              </span>
                            </div>
                            <p className="text-red-600">
                              {facility.currentMembers}/{facility.capacity} orang
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                            {usagePercentage}%
                          </span>
                        </div>
                        <p className="text-sm text-red-500 mt-2">
                          Silakan pilih fasilitas lain atau coba lagi nanti
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {maintenanceFacilities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-600">
                  🔧 Dalam Perawatan ({maintenanceFacilities.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {maintenanceFacilities.map((facility) => (
                    <div key={facility.id} className="border rounded-xl p-4 bg-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{facility.name}</h4>
                          <p className="text-gray-600">Sedang dalam perawatan</p>
                        </div>
                        <span className="px-3 py-1 bg-gray-500 text-white rounded-full text-sm font-bold">
                          MAINTENANCE
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>Estimasi selesai: {formatDate(facility.nextMaintenance)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availableFacilities.length === 0 && fullFacilities.length === 0 && maintenanceFacilities.length === 0 && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🏋️</div>
                <p className="text-gray-500">Tidak ada fasilitas tersedia saat ini</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t">
              <div className="flex justify-between">
                <button
                  onClick={() => setShowFacilityModal(false)}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Tutup
                </button>
                {isCheckedInToday && (
                  <button
                    onClick={handleCheckout}
                    className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition font-semibold"
                  >
                    🏃 Check-out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading Member Dashboard...</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'facilities', label: 'Fasilitas', icon: '🏋️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'membership', label: 'Membership', icon: '🎯' },
    { id: 'history', label: 'Riwayat', icon: '📊' },
    { id: 'payment', label: 'Pembayaran', icon: '💳' },
  ];

  const renderTabContent = () => {
    if (!memberData) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Data member tidak tersedia</div>
          <button 
            onClick={() => fetchMemberData(user?.username)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            🔄 Refresh Data
          </button>
        </div>
      );
    }

    const planInfo = getMembershipPlanInfo(memberData.membership_plan);
    const remainingDaysText = getRemainingDaysText(memberData.sisa_hari);

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className={`rounded-2xl p-6 text-white ${
              isCheckedInToday 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              <h1 className="text-2xl font-bold mb-2">
                {isCheckedInToday ? 'Selamat Berolahraga!' : 'Selamat Datang,'} {memberData.nama}! 👋
              </h1>
              <p className="opacity-90">
                {isCheckedInToday 
                  ? `Anda sudah check-in hari ini ${currentFacility ? 'di ' + currentFacility : ''}`
                  : 'Semangat berolahraga hari ini!'}
              </p>
            </div>

            <MemberDashboardStats 
              data={{
                totalVisits: memberData.total_kunjungan || 0,
                monthlyVisits: memberData.kunjungan_bulan_ini || 0,
                averageDuration: 45,
                favoriteFacility: attendanceHistory.length > 0 
                  ? attendanceHistory[0]?.facility || 'Area Cardio' 
                  : 'Area Cardio',
                lastVisit: attendanceHistory.length > 0 
                  ? formatDate(attendanceHistory[0].date) 
                  : 'Belum pernah',
                membershipDaysLeft: memberData.sisa_hari || 0,
                attendanceStreak: 3
              }}
            />

            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isCheckedInToday ? (
                  <button
                    onClick={handleDailyCheckin}
                    disabled={checkinLoading}
                    className="bg-green-500 text-white py-4 px-6 rounded-lg hover:bg-green-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <span>🎫</span>
                    <span>{checkinLoading ? 'Memproses...' : 'Check-in Harian'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowFacilityModal(true)}
                    className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <span>🏋️</span>
                    <span>{currentFacility ? 'Ganti Fasilitas' : 'Pilih Fasilitas'}</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setActiveTab('membership')}
                  className="bg-purple-500 text-white py-4 px-6 rounded-lg hover:bg-purple-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                >
                  <span>💳</span>
                  <span>Perpanjang Membership</span>
                </button>
              </div>
            </div>

            <FacilityStatus 
              facilities={facilities.slice(0, 3)}
              currentFacility={currentFacility}
              onSelectFacility={handleSelectFacility}
              loading={facilities.length === 0 && streamConnected}
            />

            <AttendanceHistory 
              data={attendanceHistory.slice(0, 5)}
              loading={historyLoading}
            />

            {isCheckedInToday && (
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Selesai berolahraga? Lakukan check-out untuk mencatat durasi
                  </p>
                  <button
                    onClick={handleCheckout}
                    className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition font-semibold"
                  >
                    🏃 Check-out dari Gym
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'facilities':
        return (
          <FacilityStatus 
            facilities={facilities}
            currentFacility={currentFacility}
            onSelectFacility={handleSelectFacility}
            detailed={true}
            loading={facilities.length === 0 && streamConnected}
          />
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-xl font-bold mb-6">👤 Profil Member</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">{memberData.nama}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">{memberData.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nomor Telepon</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">{memberData.telepon}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Alamat</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">{memberData.alamat}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">ID Member</label>
                  <div className="p-3 bg-gray-50 rounded-lg border font-mono">{memberData.nomor_member}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div className={`p-3 rounded-lg border font-medium ${
                    memberData.status === 'active' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {memberData.status === 'active' ? 'AKTIF' : 'NON-AKTIF'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-medium">
                Edit Profil
              </button>
            </div>
          </div>
        );

      case 'membership':
        return (
          <MembershipInfo 
            memberData={memberData}
            onExtendMembership={handleExtendMembership}
            detailed={true}
          />
        );

      case 'history':
        return (
          <AttendanceHistory 
            data={attendanceHistory}
            loading={historyLoading}
            detailed={true}
          />
        );

      case 'payment':
        return (
          <div className="bg-white rounded-xl shadow-lg border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">💳 Riwayat Pembayaran</h2>
              <p className="text-gray-600">Transaksi dan pembayaran membership</p>
            </div>
            
            {historyLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Memuat riwayat pembayaran...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">💳</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada transaksi</h3>
                <p className="text-gray-500">Riwayat pembayaran akan muncul di sini setelah Anda melakukan transaksi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jenis</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Deskripsi</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jumlah</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{formatDate(transaction.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{transaction.type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{transaction.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold">{formatCurrency(transaction.amount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{transaction.paymentMethod}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-6 border-t">
              <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition font-medium">
                Lihat Semua Transaksi
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-500">Tab tidak ditemukan</div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
        <nav className="bg-white shadow-lg sticky top-0 z-40">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">HS</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Member Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    {isCheckedInToday ? '✅ Sudah check-in' : '⏰ Belum check-in'}
                    {currentFacility && ` • 🏋️ ${currentFacility}`}
                    {!streamConnected && ' • 📡 Connecting...'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right hidden md:block">
                  <p className="text-gray-700 font-semibold truncate max-w-[200px]">{memberData?.nama}</p>
                  <p className="text-sm text-gray-600 truncate max-w-[200px]">
                    {isCheckedInToday && currentFacility 
                      ? `🏋️ ${currentFacility}` 
                      : `Paket ${memberData?.membership_plan}`}
                  </p>
                </div>
                
                {isCheckedInToday ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowFacilityModal(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
                    >
                      🏋️ {currentFacility ? 'Ganti Fasilitas' : 'Pilih Fasilitas'}
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
                    >
                      🏃 Check-out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDailyCheckin}
                    disabled={checkinLoading}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50"
                  >
                    {checkinLoading ? 'Memproses...' : '🎫 Check-in'}
                  </button>
                )}
                
                <button 
                  onClick={logout}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-4 flex space-x-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-blue-500 text-white shadow-md' 
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

      {renderFacilityModal()}
    </>
  );
}