'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Components
import OperationalStats from './components/OperationalStats';
import VisitorChart from './components/VisitorChart';
import MemberManagement from './components/MemberManagement';
import FacilityStatus from './components/FacilityStatus';
import AttendanceTracker from './components/AttendanceTracker';
import QuickActions from './components/QuickActions';
import ReportsPanel from './components/ReportsPanel';

// Default data untuk fallback
const defaultOperationalData = {
  stats: {
    todayVisitors: 0,
    activeMembers: 0,
    currentCapacity: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    facilityUsage: 0,
    memberCheckins: 0,
    nonMemberCheckins: 0,
    personalTrainingSessions: 0,
    classAttendances: 0
  },
  visitors: {
    today: {
      total: 0,
      members: 0,
      nonMembers: 0,
      peakHour: '18:00-19:00'
    },
    weekly: [],
    monthly: []
  },
  facilities: [
    {
      id: '1',
      name: 'Area Cardio',
      status: 'available',
      capacity: 25,
      currentUsage: 0,
      lastMaintenance: '2024-01-10',
      nextMaintenance: '2024-02-10',
      equipment: [
        { name: 'Treadmill', status: 'good', count: 8 },
        { name: 'Stationary Bike', status: 'good', count: 6 }
      ]
    },
    {
      id: '2',
      name: 'Area Weight Training',
      status: 'available',
      capacity: 35,
      currentUsage: 0,
      lastMaintenance: '2024-01-15',
      nextMaintenance: '2024-02-15',
      equipment: [
        { name: 'Dumbbells', status: 'good', count: 15 },
        { name: 'Barbells', status: 'good', count: 8 }
      ]
    }
  ]
};

const defaultMembersData: any[] = [];
const defaultAttendanceData: any[] = [];

export default function AdminOperasional() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [operationalData, setOperationalData] = useState<any>(null);
  const [membersData, setMembersData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'admin_operasional') {
      router.push('/login');
      return;
    }
    
    setUser(userObj);
    loadOperationalData();
  }, [router]);

  const loadOperationalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading operational data...');

      // Test API connection first
      try {
        const testResponse = await fetch('/api/operasional/test');
        if (!testResponse.ok) {
          throw new Error('Test API failed');
        }
        const testData = await testResponse.json();
        console.log('✅ Test API response:', testData);
      } catch (testError) {
        console.error('❌ Test API failed:', testError);
        throw new Error('API server is not responding');
      }

      const endpoints = [
        { name: 'stats', url: '/api/operasional/stats' },
        { name: 'visitors', url: '/api/operasional/visitors' },
        { name: 'facilities', url: '/api/operasional/facilities' },
        { name: 'members', url: '/api/operasional/members' },
        { name: 'attendance', url: '/api/operasional/attendance' }
      ];

      const results: any = {
        stats: null,
        visitors: null,
        facilities: null,
        members: null,
        attendance: null
      };

      // Load data for each endpoint dengan error handling per endpoint
      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Fetching ${endpoint.name}...`);
          const response = await fetch(endpoint.url);
          
          if (!response.ok) {
            console.error(`❌ ${endpoint.name} API returned ${response.status}`);
            continue;
          }

          const data = await response.json();
          if (data.success) {
            results[endpoint.name] = data.data;
            console.log(`✅ ${endpoint.name} loaded successfully`);
          } else {
            console.error(`❌ ${endpoint.name} API returned error:`, data.error);
          }
        } catch (endpointError) {
          console.error(`❌ Error fetching ${endpoint.name}:`, endpointError);
        }
      }

      // Set data dengan fallback
      setOperationalData({
        stats: results.stats || defaultOperationalData.stats,
        visitors: results.visitors || defaultOperationalData.visitors,
        facilities: results.facilities || defaultOperationalData.facilities
      });
      
      setMembersData(results.members || defaultMembersData);
      setAttendanceData(results.attendance || defaultAttendanceData);

      // Cek jika semua API gagal
      const successfulEndpoints = Object.values(results).filter(result => result !== null).length;
      if (successfulEndpoints === 0) {
        throw new Error('Tidak dapat terhubung ke server data. Periksa koneksi database.');
      } else if (successfulEndpoints < endpoints.length) {
        setError(`Beberapa data tidak dapat dimuat (${successfulEndpoints}/${endpoints.length} berhasil).`);
      }

      console.log('✅ Operational data loading completed');

    } catch (error) {
      console.error('❌ Error loading operational data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data';
      setError(errorMessage);
      
      // Set default data
      setOperationalData(defaultOperationalData);
      setMembersData(defaultMembersData);
      setAttendanceData(defaultAttendanceData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'members', label: 'Manajemen Member', icon: '👥' },
    { id: 'attendance', label: 'Presensi', icon: '📝' },
    { id: 'facilities', label: 'Fasilitas', icon: '🏋️' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
  ];

  const renderTabContent = () => {
    if (loading && activeTab === 'dashboard') {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-600">Memuat data...</span>
        </div>
      );
    }

    if (error && activeTab === 'dashboard') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-yellow-600 text-lg font-semibold mb-2">Peringatan</div>
          <p className="text-yellow-700 mb-4">{error}</p>
          <p className="text-yellow-600 text-sm mb-4">
            Beberapa data mungkin tidak tersedia. Sistem akan menampilkan data default.
          </p>
          <button
            onClick={loadOperationalData}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    // Pastikan operationalData selalu ada
    const currentOperationalData = operationalData || defaultOperationalData;
    const currentMembersData = membersData.length > 0 ? membersData : defaultMembersData;
    const currentAttendanceData = attendanceData.length > 0 ? attendanceData : defaultAttendanceData;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <QuickActions />
            <OperationalStats data={currentOperationalData.stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VisitorChart data={currentOperationalData.visitors} />
              <FacilityStatus data={currentOperationalData.facilities} />
            </div>
            <AttendanceTracker data={currentAttendanceData} />
          </div>
        );

      case 'members':
        return <MemberManagement data={currentMembersData} />;

      case 'attendance':
        return <AttendanceTracker data={currentAttendanceData} detailed />;

      case 'facilities':
        return <FacilityStatus data={currentOperationalData.facilities} detailed />;

      case 'reports':
        return (
          <div className="animate-fade-in">
            <ReportsPanel />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Operasional</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Halo, <strong>{user.nama || user.username}</strong>
              </span>
              <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
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
        {renderTabContent()}
      </div>
    </div>
  );
}