// app/admin-operasional/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Components
import OperationalStats from './components/OperationalStats';
import VisitorChart from './components/VisitorChart';
import MemberManagement from './components/MemberManagement';
import FacilityStatus from './components/FacilityStatus';
import AttendanceTracker from './components/AttendanceTracker';
import ReportsPanel from './components/ReportsPanel';

// Firebase
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query,
  where,
  Timestamp,
  orderBy
} from 'firebase/firestore';

// Types
interface MemberData {
  id: string;
  fullName?: string;
  nama?: string;
  membership_price?: number;
  membership_plan?: string;
  createdAt?: any;
  tanggal_daftar?: any;
  masa_aktif?: any;
  status?: string;
  username?: string;
  nomor_member?: string;
  [key: string]: any;
}

interface NonMemberData {
  id: string;
  daily_code?: string;
  nama?: string;
  harga?: string | number;
  created_at?: any;
  expired_at?: any;
  status?: string;
  payment_method?: string;
  username?: string;
  current_facility?: string;
  [key: string]: any;
}

interface TransactionData {
  id: string;
  memberId?: string;
  member_id?: string;
  jenis?: string;
  jumlah?: number;
  metode_pembayaran?: string;
  createdAt?: any;
  tanggal?: any;
  status?: string;
  paket?: string;
  [key: string]: any;
}

interface NonMemberTransactionData {
  id: string;
  daily_code?: string;
  nama?: string;
  jumlah?: string | number;
  metode_pembayaran?: string;
  created_at?: any;
  status?: string;
  [key: string]: any;
}

// 🔥 TIPE DATA BARU UNTUK ATTENDANCE MEMBER
interface MemberAttendanceData {
  id: string;
  userId?: string;
  userName?: string;
  checkInTime?: any;
  checkOutTime?: any;
  checkinTime?: any; // backup field
  checkoutTime?: any; // backup field
  createdAt?: any;
  date?: string;
  duration?: string;
  facility?: string;
  status?: string;
  type?: string;
  updatedAt?: any;
  [key: string]: any;
}

// 🔥 TIPE DATA BARU UNTUK NON-MEMBER VISITS
interface NonMemberVisitData {
  id: string;
  username?: string;
  checkin_time?: any;
  created_at?: any;
  nama?: string;
  daily_code?: string;
  facility_name?: string;
  facility_id?: string;
  type?: string;
  status?: string;
  checkout_time?: any;
  location?: string; // field baru dari struktur data
  updated_at?: any;
  [key: string]: any;
}

interface TodayVisit {
  id: string;
  userId?: string;
  userName: string;
  type: 'member' | 'non-member-daily';
  checkInTime: string;
  checkOutTime?: string;
  facility?: string;
  location?: string; // untuk non-member
  status: 'checked-in' | 'checked-out';
  membershipCode?: string; // untuk non-member
}

// Facility Type
interface FacilityData {
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
  maintenanceHistory?: any[];
  createdAt?: any;
  updatedAt?: any;
  usagePercentage?: number;
  activeMembers?: Array<{
    id: string;
    name: string;
    checkinTime: string;
    type?: string;
  }>;
}

// Default data
const defaultOperationalData = {
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

const defaultVisitorData = {
  today: {
    total: 0,
    members: 0,
    nonMembers: 0,
    peakHour: '18:00-19:00'
  },
  weekly: [] as Array<{date: string, visitors: number, members: number, nonMembers: number}>,
  monthly: [] as Array<{month: string, visitors: number, revenue: number}>
};

// 🔥 Custom Hook untuk SSE (Server-Sent Events)
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
          
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
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

export default function AdminOperasionalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [operationalStats, setOperationalStats] = useState(defaultOperationalData);
  const [visitorData, setVisitorData] = useState(defaultVisitorData);
  const [facilitiesData, setFacilitiesData] = useState<FacilityData[]>([]);
  const [membersData, setMembersData] = useState<MemberData[]>([]);
  const [attendanceData, setAttendanceData] = useState<TodayVisit[]>([]);
  const [nonMembersData, setNonMembersData] = useState<NonMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState(true);

  // 🔥 Gunakan SSE Hook untuk real-time facilities
  const { 
    facilities: streamFacilities, 
    lastUpdate: streamLastUpdate,
    connected: streamConnected,
    error: streamError 
  } = useFacilitiesStream('operasional');

  // State untuk data real-time tambahan
  const [memberTransactions, setMemberTransactions] = useState<TransactionData[]>([]);
  const [nonMemberTransactions, setNonMemberTransactions] = useState<NonMemberTransactionData[]>([]);
  
  // 🔥 STATE BARU UNTUK ATTENDANCE
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendanceData[]>([]);
  const [nonMemberVisits, setNonMemberVisits] = useState<NonMemberVisitData[]>([]);

  // 🔥 Update facilities data dari SSE
  useEffect(() => {
    if (streamFacilities.length > 0) {
      console.log('🔄 Updating facilities from SSE:', streamFacilities.length);
      setFacilitiesData(streamFacilities);
      
      const totalCapacity = streamFacilities.reduce((sum, facility) => sum + (facility.capacity || 0), 0);
      const currentCheckedIn = streamFacilities.reduce((sum, facility) => sum + (facility.currentMembers || 0), 0);
      const facilityUsage = totalCapacity > 0 ? Math.round((currentCheckedIn / totalCapacity) * 100) : 0;
      
      setOperationalStats(prev => ({
        ...prev,
        currentCapacity: currentCheckedIn,
        facilityUsage: facilityUsage
      }));
    }
  }, [streamFacilities]);

  // 🔥 REAL-TIME DATA FETCHING DARI FIREBASE
  useEffect(() => {
    if (!user || !realtimeMode) return;

    console.log('🔥 Setting up Firebase listeners...');

    const unsubscribers: (() => void)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Members Data
    const membersQuery = query(collection(db, 'members'));
    const unsubscribeMembers = onSnapshot(membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map((doc) => {
          const data = doc.data() as MemberData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            fullName: data.fullName || data.nama || 'Unknown',
            nama: data.nama || data.fullName || 'Unknown',
            membershipPrice: parseFloat(String(data.membership_price)) || 0,
            membershipPlan: data.membership_plan || 'Unknown',
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            tanggal_daftar: data.tanggal_daftar?.toDate?.() || data.tanggal_daftar || new Date(),
            masa_aktif: data.masa_aktif ? new Date(data.masa_aktif) : null,
            status: data.status || 'unknown',
            username: data.username || data.id,
            nomor_member: data.nomor_member || `MEM${doc.id.slice(0, 6).toUpperCase()}`
          };
        });
        
        console.log('👥 Realtime members:', members.length);
        setMembersData(members);
        
        // Hitung member aktif (berdasarkan masa aktif)
        const now = new Date();
        const activeMembers = members.filter(member => {
          if (member.status !== 'active') return false;
          if (!member.masa_aktif) return false;
          return new Date(member.masa_aktif) >= now;
        }).length;
        
        setOperationalStats(prev => ({
          ...prev,
          activeMembers,
        }));
      },
      (error) => {
        console.error('Error members:', error);
      }
    );
    unsubscribers.push(unsubscribeMembers);

    // 2. Non-Members Data (untuk daily pass)
    const nonMembersQuery = query(collection(db, 'non_members'));
    const unsubscribeNonMembers = onSnapshot(nonMembersQuery,
      (snapshot) => {
        const allNonMembers = snapshot.docs.map((doc) => {
          const data = doc.data() as NonMemberData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            dailyCode: data.daily_code || data.id,
            nama: data.nama || 'Unknown',
            harga: parseFloat(String(data.harga)) || 15000,
            created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            expired_at: data.expired_at?.toDate?.()?.toISOString() || data.expired_at,
            status: data.status || 'active',
            paymentMethod: data.payment_method || 'qris',
            username: data.username || data.id
          };
        });

        const now = new Date();
        const activeNonMembers = allNonMembers.filter((nm) => {
          if (nm.status !== 'active') return false;
          if (!nm.expired_at) return false;
          const expiredDate = new Date(nm.expired_at);
          return expiredDate >= now;
        });
        
        console.log('🎫 Realtime non-members:', activeNonMembers.length);
        setNonMembersData(activeNonMembers);
      },
      (error) => {
        console.error('Error non-members:', error);
      }
    );
    unsubscribers.push(unsubscribeNonMembers);

    // 🔥 3. MEMBER ATTENDANCE (collection "attendance")
    const memberAttendanceQuery = query(
      collection(db, 'attendance'),
      where('checkInTime', '>=', Timestamp.fromDate(today)),
      orderBy('checkInTime', 'desc')
    );
    
    const unsubscribeMemberAttendance = onSnapshot(memberAttendanceQuery,
      (snapshot) => {
        const attendance = snapshot.docs.map((doc) => {
          const data = doc.data() as MemberAttendanceData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            // Normalisasi nama field
            checkInTime: data.checkInTime?.toDate?.() || data.checkinTime?.toDate?.() || data.checkInTime,
            checkOutTime: data.checkOutTime?.toDate?.() || data.checkoutTime?.toDate?.() || data.checkOutTime,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            userName: data.userName || 'Member',
            userId: data.userId || '',
            status: data.status || 'checked_out',
            type: data.type || 'member',
            facility: data.facility || 'Gym Area',
            date: data.date || new Date().toISOString().split('T')[0]
          };
        });
        
        console.log('📊 Member attendance today:', attendance.length);
        setMemberAttendance(attendance);
      },
      (error) => {
        console.error('Error member attendance:', error);
      }
    );
    unsubscribers.push(unsubscribeMemberAttendance);

    // 🔥 4. NON-MEMBER VISITS (collection "non_member_visits")
    const nmVisitsQuery = query(
      collection(db, 'non_member_visits'),
      where('checkin_time', '>=', Timestamp.fromDate(today)),
      orderBy('checkin_time', 'desc')
    );
    
    const unsubscribeNMVisits = onSnapshot(nmVisitsQuery,
      (snapshot) => {
        const nmVisits = snapshot.docs.map((doc) => {
          const data = doc.data() as NonMemberVisitData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            // Normalisasi field
            checkin_time: data.checkin_time?.toDate?.() || data.checkin_time,
            checkout_time: data.checkout_time?.toDate?.() || data.checkout_time,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at,
            status: data.status || 'completed',
            type: data.type || 'daily_checkin',
            nama: data.nama || 'Non-Member',
            daily_code: data.daily_code || `NM${doc.id.slice(0, 6).toUpperCase()}`,
            location: data.location || data.facility_name || 'Main Gym Area',
            username: data.username || ''
          };
        });
        
        console.log('🎫 Non-member visits today:', nmVisits.length);
        setNonMemberVisits(nmVisits);
      },
      (error) => {
        console.error('Error non-member visits:', error);
      }
    );
    unsubscribers.push(unsubscribeNMVisits);

    // 5. Member Transactions
    const memberTransactionsQuery = query(collection(db, 'transactions'));
    const unsubscribeMemberTransactions = onSnapshot(memberTransactionsQuery,
      (snapshot) => {
        const transactions = snapshot.docs.map((doc) => {
          const data = doc.data() as TransactionData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            memberId: data.memberId || data.member_id || '',
            jenis: data.jenis || '',
            jumlah: parseFloat(String(data.jumlah)) || 0,
            metodePembayaran: data.metode_pembayaran || 'qris',
            paket: data.paket || '',
            createdAt: data.createdAt?.toDate?.() || data.createdAt || 
                      data.tanggal?.toDate?.() || data.tanggal || new Date(),
            status: data.status || 'completed'
          };
        });
        
        console.log('💳 Member transactions:', transactions.length);
        setMemberTransactions(transactions);
      },
      (error) => {
        console.error('Error member transactions:', error);
      }
    );
    unsubscribers.push(unsubscribeMemberTransactions);

    // 6. Non-Member Transactions
    const nmTransactionsQuery = query(collection(db, 'non_member_transactions'));
    const unsubscribeNMTransactions = onSnapshot(nmTransactionsQuery,
      (snapshot) => {
        const transactions = snapshot.docs.map((doc) => {
          const data = doc.data() as NonMemberTransactionData;
          return {
            _id: doc.id,
            __id: doc.id,
            
            ...data,
            dailyCode: data.daily_code || '',
            nama: data.nama || 'Unknown',
            jumlah: parseFloat(String(data.jumlah)) || 0,
            metodePembayaran: data.metode_pembayaran || 'qris',
            createdAt: data.created_at?.toDate?.() || data.created_at || new Date(),
            status: data.status || 'completed'
          };
        });
        
        console.log('🎫 Non-member transactions:', transactions.length);
        setNonMemberTransactions(transactions);
      },
      (error) => {
        console.error('Error non-member transactions:', error);
      }
    );
    unsubscribers.push(unsubscribeNMTransactions);

    // Cleanup
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      console.log('🧹 Cleaned up Firebase listeners');
    };
  }, [user, realtimeMode]);

  // 🔥 FUNGSI: Combine attendance data dari MULTIPLE sources
  const combineAttendanceData = () => {
    const todayVisits: TodayVisit[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔄 Combining attendance data...');
    console.log('👤 Member attendance records:', memberAttendance.length);
    console.log('🎫 Non-member visit records:', nonMemberVisits.length);
    
    // 🔥 Process MEMBER attendance
    memberAttendance.forEach(att => {
      if (!att.checkInTime) {
        console.log('Skipping member attendance without checkInTime:', att.id);
        return;
      }
      
      const checkinDate = new Date(att.checkInTime);
      if (checkinDate < today) {
        console.log('Skipping old member attendance:', att.id, checkinDate);
        return;
      }
      
      // Cari data member untuk mendapatkan nama lengkap
      const member = membersData.find(m => 
        m.id === att.userId || 
        m._id === att.userId || 
        m.username === att.userId ||
        m.nomor_member === att.userId
      );
      
      // Tentukan status
      const isCheckedIn = att.status === 'checked_in' || 
                         (att.status === 'active' && !att.checkOutTime);
      
      const status = isCheckedIn ? 'checked-in' : 'checked-out';
      
      todayVisits.push({
        id: att.id,
        userId: att.userId,
        userName: member?.nama || member?.fullName || att.userName || 'Member',
        type: 'member',
        checkInTime: new Date(att.checkInTime).toISOString(),
        checkOutTime: att.checkOutTime ? new Date(att.checkOutTime).toISOString() : undefined,
        facility: att.facility || 'Gym Area',
        status: status,
        membershipCode: member?.nomor_member || att.userId
      });
    });
    
    // 🔥 Process NON-MEMBER visits
    nonMemberVisits.forEach(visit => {
      if (!visit.checkin_time) {
        console.log('Skipping non-member visit without checkin_time:', visit.id);
        return;
      }
      
      const checkinDate = new Date(visit.checkin_time);
      if (checkinDate < today) {
        console.log('Skipping old non-member visit:', visit.id, checkinDate);
        return;
      }
      
      // Tentukan status non-member
      const isActive = visit.status === 'active' || 
                      (visit.status === 'checked_in' && !visit.checkout_time);
      
      const status = isActive ? 'checked-in' : 'checked-out';
      
      todayVisits.push({
        id: visit.id,
        userId: visit.username || visit.daily_code,
        userName: visit.nama || `Non-Member (${visit.daily_code || 'Daily'})`,
        type: 'non-member-daily',
        checkInTime: new Date(visit.checkin_time).toISOString(),
        checkOutTime: visit.checkout_time ? new Date(visit.checkout_time).toISOString() : undefined,
        facility: visit.location || visit.facility_name || 'Gym Area',
        location: visit.location || 'Main Gym Area',
        status: status,
        membershipCode: visit.daily_code
      });
    });
    
    // Sort by check-in time (newest first)
    todayVisits.sort((a, b) => {
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
    });
    
    console.log('📊 Total combined visits today:', todayVisits.length);
    console.log('👤 Member visits:', todayVisits.filter(v => v.type === 'member').length);
    console.log('🎫 Non-member visits:', todayVisits.filter(v => v.type === 'non-member-daily').length);
    
    setAttendanceData(todayVisits);
    
    // Update stats
    updateStatsFromAttendance(todayVisits);
  };

  // 🔥 Update stats dari attendance
  useEffect(() => {
    if ((memberAttendance.length > 0 || nonMemberVisits.length > 0)) {
      combineAttendanceData();
    }
  }, [memberAttendance, nonMemberVisits, membersData]);

  const updateStatsFromAttendance = (todayVisits: TodayVisit[]) => {
    console.log('📈 Updating stats from attendance:', todayVisits.length);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filter untuk hari ini
    const todayMemberVisits = todayVisits.filter(v => {
      try {
        const visitDate = new Date(v.checkInTime).toISOString().split('T')[0];
        return visitDate === today && v.type === 'member';
      } catch {
        return false;
      }
    });
    
    const todayNonMemberVisits = todayVisits.filter(v => {
      try {
        const visitDate = new Date(v.checkInTime).toISOString().split('T')[0];
        return visitDate === today && v.type === 'non-member-daily';
      } catch {
        return false;
      }
    });
    
    console.log('👥 Member visits today:', todayMemberVisits.length);
    console.log('🎫 Non-member visits today:', todayNonMemberVisits.length);
    
    // Yang sedang aktif di gym sekarang (checked-in)
    const activeInGym = todayVisits.filter(v => v.status === 'checked-in');
    const activeMembers = activeInGym.filter(v => v.type === 'member').length;
    const activeNonMembers = activeInGym.filter(v => v.type === 'non-member-daily').length;
    
    console.log('🏋️ Currently in gym (active):', activeInGym.length);
    console.log('👤 Active members in gym:', activeMembers);
    console.log('🎫 Active non-members in gym:', activeNonMembers);
    
    // Hitung training sessions
    const personalTrainingSessions = todayVisits.filter(v => 
      v.facility?.toLowerCase().includes('training') || 
      v.facility?.toLowerCase().includes('personal') ||
      v.location?.toLowerCase().includes('training') ||
      v.location?.toLowerCase().includes('personal')
    ).length;
    
    // Hitung class attendances
    const classAttendances = todayVisits.filter(v => 
      v.facility?.toLowerCase().includes('class') || 
      v.facility?.toLowerCase().includes('yoga') || 
      v.facility?.toLowerCase().includes('studio') ||
      v.location?.toLowerCase().includes('class') ||
      v.location?.toLowerCase().includes('yoga') ||
      v.location?.toLowerCase().includes('studio')
    ).length;

    // Hitung revenue
    const todayRevenue = calculateTodayRevenue(memberTransactions, nonMemberTransactions);
    const monthlyRevenue = calculateMonthlyRevenue(memberTransactions, nonMemberTransactions, membersData);

    // Hitung total member aktif (berdasarkan masa aktif, bukan yang checkin)
    const now = new Date();
    const activeMembersCount = membersData.filter(member => {
      if (member.status !== 'active') return false;
      if (!member.masa_aktif) return false;
      return new Date(member.masa_aktif) >= now;
    }).length;

    // Update operational stats
    const updatedStats = {
      todayVisitors: todayMemberVisits.length + todayNonMemberVisits.length,
      activeMembers: activeMembersCount,
      currentCapacity: activeInGym.length,
      todayRevenue: todayRevenue,
      monthlyRevenue: monthlyRevenue,
      facilityUsage: facilitiesData.length > 0 
        ? Math.round((activeInGym.length / (facilitiesData.reduce((sum, f) => sum + (f.capacity || 0), 0) || 1)) * 100)
        : 0,
      memberCheckins: todayMemberVisits.length,
      nonMemberCheckins: todayNonMemberVisits.length,
      personalTrainingSessions: personalTrainingSessions,
      classAttendances: classAttendances
    };
    
    console.log('📊 Updated operational stats:', updatedStats);
    
    setOperationalStats(updatedStats);

    // Update visitor data today
    setVisitorData(prev => ({
      ...prev,
      today: {
        total: todayMemberVisits.length + todayNonMemberVisits.length,
        members: todayMemberVisits.length,
        nonMembers: todayNonMemberVisits.length,
        peakHour: calculatePeakHour(todayVisits)
      }
    }));
  };

  // 🔥 FUNGSI: Calculate peak hour
  const calculatePeakHour = (attendance: TodayVisit[]) => {
    if (attendance.length === 0) return '18:00-19:00';
    
    const hours = attendance.reduce((acc: any, att) => {
      if (!att.checkInTime) return acc;
      const hour = new Date(att.checkInTime).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(hours).length === 0) return '18:00-19:00';
    
    const peakHour = Object.keys(hours).reduce((a, b) => 
      hours[a] > hours[b] ? a : b, '18'
    );
    return `${peakHour.toString().padStart(2, '0')}:00-${(parseInt(peakHour) + 1).toString().padStart(2, '0')}:00`;
  };

  // 🔥 FUNGSI: Generate visitor chart data
  const generateVisitorChartData = () => {
    const weeklyData: Array<{date: string, visitors: number, members: number, nonMembers: number}> = [];
    const monthlyData: Array<{month: string, visitors: number, revenue: number}> = [];
    const today = new Date();
    
    // Generate data 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter member attendance
      const memberVisitsCount = memberAttendance.filter(v => {
        if (!v.checkInTime) return false;
        const visitDate = new Date(v.checkInTime).toISOString().split('T')[0];
        return visitDate === dateStr;
      }).length;
      
      // Filter non-member visits
      const nonMemberVisitsCount = nonMemberVisits.filter(v => {
        if (!v.checkin_time) return false;
        const visitDate = new Date(v.checkin_time).toISOString().split('T')[0];
        return visitDate === dateStr;
      }).length;

      weeklyData.push({
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        visitors: memberVisitsCount + nonMemberVisitsCount,
        members: memberVisitsCount,
        nonMembers: nonMemberVisitsCount
      });
    }

    // Generate monthly data (3 bulan terakhir)
    for (let i = 2; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = month.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const monthlyMemberVisits = memberAttendance.filter(v => {
        if (!v.checkInTime) return false;
        const visitDate = new Date(v.checkInTime);
        return visitDate >= monthStart && visitDate <= monthEnd;
      }).length;
      
      const monthlyNMVisits = nonMemberVisits.filter(v => {
        if (!v.checkin_time) return false;
        const visitDate = new Date(v.checkin_time);
        return visitDate >= monthStart && visitDate <= monthEnd;
      }).length;

      const monthlyVisitors = monthlyMemberVisits + monthlyNMVisits;
      
      const monthlyRevenue = calculateMonthlyRevenue(
        memberTransactions.filter(tx => {
          if (!tx.createdAt) return false;
          const txDate = new Date(tx.createdAt);
          return txDate >= monthStart && txDate <= monthEnd;
        }),
        nonMemberTransactions.filter(tx => {
          if (!tx.createdAt) return false;
          const txDate = new Date(tx.createdAt);
          return txDate >= monthStart && txDate <= monthEnd;
        }),
        membersData.filter(m => {
          const joinDate = m.createdAt || m.tanggal_daftar;
          if (!joinDate) return false;
          const joinDateObj = joinDate instanceof Date ? joinDate : new Date(joinDate);
          return joinDateObj >= monthStart && joinDateObj <= monthEnd;
        })
      );

      monthlyData.push({
        month: monthStr,
        visitors: monthlyVisitors,
        revenue: monthlyRevenue
      });
    }

    setVisitorData(prev => ({
      ...prev,
      weekly: weeklyData,
      monthly: monthlyData
    }));
  };

  // 🔥 Update chart data
  useEffect(() => {
    if (memberAttendance.length > 0 || nonMemberVisits.length > 0) {
      generateVisitorChartData();
    }
  }, [memberAttendance, nonMemberVisits, memberTransactions, nonMemberTransactions, membersData]);

  // Fungsi untuk menghitung pendapatan bulanan
  const calculateMonthlyRevenue = (memberTx: TransactionData[], nmTx: NonMemberTransactionData[], members: MemberData[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Revenue dari transaksi member bulan ini
    const memberRevenue = memberTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);
    
    // Revenue dari transaksi non-member bulan ini
    const nonMemberRevenue = nmTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);
    
    // Revenue dari membership plan
    const membershipRevenue = members.filter(m => {
      const joinDate = m.createdAt || m.tanggal_daftar;
      if (!joinDate) return false;
      const joinDateObj = joinDate instanceof Date ? joinDate : new Date(joinDate);
      return joinDateObj.getMonth() === currentMonth && 
             joinDateObj.getFullYear() === currentYear;
    }).reduce((sum, m) => sum + (parseFloat(String(m.membership_price)) || 0), 0);
    
    return memberRevenue + nonMemberRevenue + membershipRevenue;
  };

  // Fungsi untuk menghitung pendapatan hari ini
  const calculateTodayRevenue = (memberTx: TransactionData[], nmTx: NonMemberTransactionData[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const todayMemberRevenue = memberTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      return txDate === today;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);
    
    const todayNonMemberRevenue = nmTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      return txDate === today;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);
    
    return todayMemberRevenue + todayNonMemberRevenue;
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
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    streamConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    📡 SSE: {streamConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    🏋️ Fasilitas: {facilitiesData.length}
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    👥 Member: {membersData.length}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    🎫 Non-Member: {nonMembersData.length}
                  </div>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    📊 Presensi Hari Ini: {attendanceData.length}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    Update: {streamLastUpdate.toLocaleTimeString('id-ID')}
                  </span>
                  <button
                    onClick={toggleRealtimeMode}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    {realtimeMode ? 'Matikan Realtime' : 'Hidupkan Realtime'}
                  </button>
                </div>
              </div>
              {streamError && (
                <div className="mt-2 text-sm text-red-600">
                  ⚠️ {streamError}
                </div>
              )}
              
              {/* 🔥 DEBUG INFO */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Member Attendance:</span> {memberAttendance.length}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Non-Member Visits:</span> {nonMemberVisits.length}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Active in Gym:</span> {attendanceData.filter(a => a.status === 'checked-in').length}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Today's Revenue:</span> Rp {operationalStats.todayRevenue.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <OperationalStats data={operationalStats} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VisitorChart data={visitorData} />
              <FacilityStatus data={facilitiesData} />
            </div>

            <AttendanceTracker 
              data={attendanceData} 
              membersData={membersData} 
            />
          </div>
        );

      case 'members':
        return <MemberManagement data={membersData} />;

      case 'attendance':
        return <AttendanceTracker 
          data={attendanceData} 
          membersData={membersData} 
          detailed 
        />;

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
                <p className="text-sm text-gray-600">HS Gym Management System - Real-time</p>
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