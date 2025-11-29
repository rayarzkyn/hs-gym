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

// Firebase
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy
} from 'firebase/firestore';

// Types
import { 
  OperationalStatsData, 
  VisitorData, 
  Facility, 
  Member,
  AttendanceRecord,
  NonMember 
} from './types';

// Default data
const defaultOperationalData: OperationalStatsData = {
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
};

const defaultVisitorData: VisitorData = {
  today: {
    total: 0,
    members: 0,
    nonMembers: 0,
    peakHour: '18:00-19:00'
  },
  weekly: [],
  monthly: []
};

// Interface untuk chart data
interface WeeklyDataItem {
  date: string;
  visitors: number;
  members: number;
  nonMembers: number;
}

interface MonthlyDataItem {
  month: string;
  visitors: number;
  revenue: number;
}

export default function AdminOperasionalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [operationalStats, setOperationalStats] = useState<OperationalStatsData>(defaultOperationalData);
  const [visitorData, setVisitorData] = useState<VisitorData>(defaultVisitorData);
  const [facilitiesData, setFacilitiesData] = useState<Facility[]>([]);
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [nonMembersData, setNonMembersData] = useState<NonMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState(true);

  // 🔥 REAL-TIME DATA FETCHING DARI FIREBASE
  useEffect(() => {
    if (!user || !realtimeMode) return;

    console.log('🔥 Setting up REAL-TIME Firebase listeners...');

    // 1. Facilities Data
    const facilitiesQuery = query(collection(db, 'facilities'));
    const unsubscribeFacilities = onSnapshot(facilitiesQuery, 
      (snapshot) => {
        const facilities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Facility[];
        console.log('🏢 Realtime facilities:', facilities.length);
        setFacilitiesData(facilities);
      },
      (error) => {
        console.error('Error facilities:', error);
      }
    );

    // 2. Members Data
    const membersQuery = query(collection(db, 'members'));
    const unsubscribeMembers = onSnapshot(membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Member[];
        console.log('👥 Realtime members:', members.length);
        setMembersData(members);
        
        // Update active members count
        const activeMembers = members.filter((m: Member) => 
          m.status === 'active' || m.status === 'paid'
        ).length;
        
        setOperationalStats(prev => ({
          ...prev,
          activeMembers
        }));
      },
      (error) => {
        console.error('Error members:', error);
      }
    );

    // 3. Attendance Data - All data, kita filter manual
    const attendanceQuery = query(
      collection(db, 'attendance'), 
      orderBy('checkInTime', 'desc')
    );
    const unsubscribeAttendance = onSnapshot(attendanceQuery,
      (snapshot) => {
        const allAttendance = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            checkInTime: data.checkInTime?.toDate?.()?.toISOString() || data.checkInTime,
            checkOutTime: data.checkOutTime?.toDate?.()?.toISOString() || data.checkOutTime,
          } as AttendanceRecord;
        });

        console.log('📝 All attendance records:', allAttendance.length);

        // Process attendance data untuk stats real-time
        processAttendanceData(allAttendance);
      },
      (error) => {
        console.error('Error attendance:', error);
      }
    );

    // 4. Non-Members Data
    const nonMembersQuery = query(collection(db, 'non_members'));
    const unsubscribeNonMembers = onSnapshot(nonMembersQuery,
      (snapshot) => {
        const allNonMembers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            expired_at: data.expired_at?.toDate?.()?.toISOString() || data.expired_at,
          } as NonMember;
        });

        console.log('🎫 All non-members:', allNonMembers.length);

        // Filter active non-members
        const activeNonMembers = allNonMembers.filter((nm: NonMember) => 
          nm.status === 'active'
        );
        setNonMembersData(activeNonMembers);
      },
      (error) => {
        console.error('Error non-members:', error);
      }
    );

    // Cleanup
    return () => {
      unsubscribeFacilities();
      unsubscribeMembers();
      unsubscribeAttendance();
      unsubscribeNonMembers();
      console.log('🧹 Cleaned up realtime listeners');
    };
  }, [user, realtimeMode]);

  // Process attendance data untuk generate stats dan visitor data
  const processAttendanceData = (allAttendance: AttendanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter untuk hari ini
    const todayAttendance = allAttendance.filter(att => {
      const attDate = new Date(att.checkInTime).toISOString().split('T')[0];
      return attDate === today;
    });

    console.log('📊 Today attendance:', todayAttendance.length);

    // Set attendance data untuk display
    setAttendanceData(todayAttendance);

    // Calculate stats
    const memberCheckins = todayAttendance.filter(a => a.type === 'member').length;
    const nonMemberCheckins = todayAttendance.filter(a => 
      a.type === 'non_member' || a.type === 'non-member'
    ).length;
    const currentCheckedIn = todayAttendance.filter(a => !a.checkOutTime).length;
    const todayRevenue = nonMemberCheckins * 25000; // Asumsi 25k per non-member

    // Update operational stats
    setOperationalStats({
      todayVisitors: memberCheckins + nonMemberCheckins,
      activeMembers: membersData.filter(m => m.status === 'active' || m.status === 'paid').length,
      currentCapacity: currentCheckedIn,
      todayRevenue: todayRevenue,
      monthlyRevenue: todayRevenue * 30, // Estimasi bulanan
      facilityUsage: Math.round((currentCheckedIn / 50) * 100), // Asumsi kapasitas 50
      memberCheckins: memberCheckins,
      nonMemberCheckins: nonMemberCheckins,
      personalTrainingSessions: todayAttendance.filter(a => 
        a.facility?.includes('training') || a.facility?.includes('personal')
      ).length,
      classAttendances: todayAttendance.filter(a => 
        a.facility?.includes('class') || a.facility?.includes('yoga') || a.facility?.includes('studio')
      ).length
    });

    // Generate visitor data untuk chart (7 hari terakhir)
    generateVisitorChartData(allAttendance);
  };

  // Generate visitor data untuk chart dari data real
  const generateVisitorChartData = (allAttendance: AttendanceRecord[]) => {
    const weeklyData: WeeklyDataItem[] = [];
    const monthlyData: MonthlyDataItem[] = [];
    const today = new Date();
    
    // Generate data 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter attendance untuk tanggal ini
      const dayAttendance = allAttendance.filter(att => {
        const attDate = new Date(att.checkInTime).toISOString().split('T')[0];
        return attDate === dateStr;
      });

      const memberVisits = dayAttendance.filter(a => a.type === 'member').length;
      const nonMemberVisits = dayAttendance.filter(a => 
        a.type === 'non_member' || a.type === 'non-member'
      ).length;

      weeklyData.push({
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        visitors: memberVisits + nonMemberVisits,
        members: memberVisits,
        nonMembers: nonMemberVisits
      });
    }

    // Generate monthly data (3 bulan terakhir)
    for (let i = 2; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = month.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      // Hitung visitor untuk bulan ini (simplified - dalam implementasi real, hitung dari data)
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const monthlyAttendance = allAttendance.filter(att => {
        const attDate = new Date(att.checkInTime);
        return attDate >= monthStart && attDate <= monthEnd;
      });

      const monthlyVisitors = monthlyAttendance.length;
      const monthlyRevenue = monthlyVisitors * 25000; // Estimasi revenue

      monthlyData.push({
        month: monthStr,
        visitors: monthlyVisitors,
        revenue: monthlyRevenue
      });
    }

    // Update visitor data
    setVisitorData({
      today: {
        total: operationalStats.todayVisitors,
        members: operationalStats.memberCheckins,
        nonMembers: operationalStats.nonMemberCheckins,
        peakHour: calculatePeakHour(attendanceData)
      },
      weekly: weeklyData,
      monthly: monthlyData
    });
  };

  const calculatePeakHour = (attendance: AttendanceRecord[]) => {
    if (attendance.length === 0) return '18:00-19:00';
    
    const hours = attendance.reduce((acc: any, att) => {
      const hour = new Date(att.checkInTime).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHour = Object.keys(hours).reduce((a, b) => 
      hours[a] > hours[b] ? a : b, '18'
    );
    return `${peakHour}:00-${parseInt(peakHour) + 1}:00`;
  };

  // Auth check
  useEffect(() => {
    if (authChecked) return;

    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        const staffUser = localStorage.getItem('staffUser');
        
        let userObj = null;
        if (userData) {
          userObj = JSON.parse(userData);
        } else if (staffUser) {
          userObj = JSON.parse(staffUser);
        }

        if (!userObj) {
          router.push('/login');
          return;
        }
        
        const allowedRoles = ['admin_operasional', 'operasional', 'admin', 'manager'];
        if (!allowedRoles.includes(userObj.role)) {
          router.push('/login');
          return;
        }
        
        setUser(userObj);
        setAuthChecked(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, authChecked]);

  const toggleRealtimeMode = () => setRealtimeMode(!realtimeMode);
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('staffUser');
    router.push('/');
  };

  // Loading state
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">Memeriksa authentication...</div>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 flex items-center justify-center">
        <div className="text-xl">Redirecting...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'members', label: 'Manajemen Member', icon: '👥' },
    { id: 'attendance', label: 'Presensi', icon: '📝' },
    { id: 'facilities', label: 'Fasilitas', icon: '🏋️' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Status Bar */}
            <div className="bg-white rounded-xl p-4 shadow-lg border">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    realtimeMode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    🔴 Realtime: {realtimeMode ? 'ON' : 'OFF'}
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    👥 Online: {attendanceData.filter(a => !a.checkOutTime).length}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    🏢 Facilities: {facilitiesData.length}
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    👥 Members: {membersData.length}
                  </div>
                </div>
                <button
                  onClick={toggleRealtimeMode}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  {realtimeMode ? 'Matikan Realtime' : 'Hidupkan Realtime'}
                </button>
              </div>
            </div>

            <QuickActions />
            <OperationalStats data={operationalStats} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VisitorChart data={visitorData} />
              <FacilityStatus data={facilitiesData} />
            </div>

            <AttendanceTracker data={attendanceData} />
          </div>
        );

      case 'members':
        return <MemberManagement data={membersData} />;

      case 'attendance':
        return <AttendanceTracker data={attendanceData} detailed />;

      case 'facilities':
        return <FacilityStatus data={facilitiesData} detailed />;

      case 'reports':
        return <ReportsPanel onRefresh={() => window.location.reload()} />;

      default:
        return <div className="bg-white rounded-xl p-6 text-center">Tab tidak ditemukan</div>;
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
              <div className="text-right">
                <div className="text-gray-700 font-medium">{user.nama || user.username}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
              </div>
              <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
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
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        {renderTabContent()}
      </main>
    </div>
  );
}