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

// Types (tetap sama seperti sebelumnya)
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

interface MemberAttendanceData {
  id: string;
  userId?: string;
  userName?: string;
  checkInTime?: any;
  checkOutTime?: any;
  checkinTime?: any;
  checkoutTime?: any;
  createdAt?: any;
  date?: string;
  duration?: string;
  facility?: string;
  status?: string;
  type?: string;
  updatedAt?: any;
  [key: string]: any;
}

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
  location?: string;
  login_type?: string;
  activity_type?: string;
  is_visit?: boolean;
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
  location?: string;
  status: 'checked-in' | 'checked-out';
  membershipCode?: string;
  login_type?: string;
}

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
  weekly: [] as Array<{ date: string, visitors: number, members: number, nonMembers: number }>,
  monthly: [] as Array<{ month: string, visitors: number, revenue: number }>
};

// Custom Hook untuk SSE
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

  const {
    facilities: streamFacilities,
    lastUpdate: streamLastUpdate,
    connected: streamConnected,
    error: streamError
  } = useFacilitiesStream('operasional');

  const [memberTransactions, setMemberTransactions] = useState<TransactionData[]>([]);
  const [nonMemberTransactions, setNonMemberTransactions] = useState<NonMemberTransactionData[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendanceData[]>([]);
  const [nonMemberVisits, setNonMemberVisits] = useState<NonMemberVisitData[]>([]);
  const [nonMemberFacilityActivities, setNonMemberFacilityActivities] = useState<NonMemberVisitData[]>([]);

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

  useEffect(() => {
    if (!user || !realtimeMode) return;

    console.log('🔥 Setting up Firebase listeners...');

    const unsubscribers: (() => void)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For weekly/monthly statistics, we need 90 days of historical data
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - 90);
    historyStart.setHours(0, 0, 0, 0);

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

    // 2. Non-Members Data
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

    // 3. MEMBER ATTENDANCE (90 days history for weekly/monthly stats)
    const memberAttendanceQuery = query(
      collection(db, 'attendance'),
      where('checkInTime', '>=', Timestamp.fromDate(historyStart)),
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

        console.log('📊 Member attendance (90 days):', attendance.length);
        setMemberAttendance(attendance);
      },
      (error) => {
        console.error('Error member attendance:', error);
      }
    );
    unsubscribers.push(unsubscribeMemberAttendance);

    // 4. NON-MEMBER VISITS (90 days history for weekly/monthly stats)
    const nmVisitsQuery = query(
      collection(db, 'non_member_visits'),
      where('checkin_time', '>=', Timestamp.fromDate(historyStart)),
      orderBy('checkin_time', 'desc')
    );

    const unsubscribeNMVisits = onSnapshot(nmVisitsQuery,
      (snapshot) => {
        const allNMVisits = snapshot.docs.map((doc) => {
          const data = doc.data() as NonMemberVisitData;
          return {
            _id: doc.id,
            __id: doc.id,

            ...data,
            checkin_time: data.checkin_time?.toDate?.() || data.checkin_time,
            checkout_time: data.checkout_time?.toDate?.() || data.checkout_time,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at,
            status: data.status || 'completed',
            type: data.type || 'daily_checkin',
            nama: data.nama || 'Non-Member',
            daily_code: data.daily_code || `NM${doc.id.slice(0, 6).toUpperCase()}`,
            location: data.location || data.facility_name || 'Main Gym Area',
            username: data.username || '',
            login_type: data.login_type || 'unknown',
            activity_type: data.activity_type || 'unknown',
            is_visit: data.is_visit !== false
          };
        });

        const dailyCheckinsOnly = allNMVisits.filter(visit => {
          const isDailyCheckin = visit.login_type === 'non_member_daily';
          const hasNoLoginType = !visit.login_type || visit.login_type === 'unknown';
          const isVisitFieldTrue = visit.is_visit === true;
          const isNotFacilityActivity = visit.activity_type === 'unknown' ||
            !visit.activity_type ||
            (visit.login_type !== 'facility_activity');

          return (isDailyCheckin) || (hasNoLoginType && isVisitFieldTrue && isNotFacilityActivity);
        });

        const facilityActivities = allNMVisits.filter(visit =>
          visit.login_type === 'facility_activity' ||
          visit.activity_type === 'enter' ||
          visit.activity_type === 'switch'
        );

        console.log('🎫 Non-member visits FILTERED:', {
          totalRecords: allNMVisits.length,
          dailyCheckins: dailyCheckinsOnly.length,
          facilityActivities: facilityActivities.length,
          debug: {
            'non_member_daily': allNMVisits.filter(v => v.login_type === 'non_member_daily').length,
            'facility_activity': allNMVisits.filter(v => v.login_type === 'facility_activity').length,
            'unknown': allNMVisits.filter(v => !v.login_type || v.login_type === 'unknown').length
          }
        });

        setNonMemberVisits(dailyCheckinsOnly);
        setNonMemberFacilityActivities(facilityActivities);
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

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      console.log('🧹 Cleaned up Firebase listeners');
    };
  }, [user, realtimeMode]);

  const combineAttendanceData = () => {
    const todayVisits: TodayVisit[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('🔄 Combining attendance data...');
    console.log('👤 Member attendance records:', memberAttendance.length);
    console.log('🎫 Non-member daily checkins (filtered):', nonMemberVisits.length);
    console.log('🏋️ Non-member facility activities:', nonMemberFacilityActivities.length);

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

      const member = membersData.find(m =>
        m.id === att.userId ||
        m._id === att.userId ||
        m.username === att.userId ||
        m.nomor_member === att.userId
      );

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

    const processedNonMemberCodes = new Set();

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

      if (visit.login_type && visit.login_type !== 'non_member_daily') {
        console.log('⏩ Skipping non-daily visit (login_type):', visit.login_type, visit.nama);
        return;
      }

      const dailyCode = visit.daily_code || visit.username;
      if (!dailyCode) return;

      if (processedNonMemberCodes.has(dailyCode)) {
        console.log('⏩ Skipping duplicate non-member code:', dailyCode);
        return;
      }
      processedNonMemberCodes.add(dailyCode);

      const isActive = visit.status === 'active' ||
        (visit.status === 'checked_in' && !visit.checkout_time);

      todayVisits.push({
        id: visit.id,
        userId: visit.username || dailyCode,
        userName: visit.nama || `Non-Member (${dailyCode})`,
        type: 'non-member-daily',
        checkInTime: new Date(visit.checkin_time).toISOString(),
        checkOutTime: visit.checkout_time ? new Date(visit.checkout_time).toISOString() : undefined,
        facility: visit.location || visit.facility_name || 'Gym Area',
        location: visit.location || 'Main Gym Area',
        status: isActive ? 'checked-in' : 'checked-out',
        membershipCode: dailyCode,
        login_type: visit.login_type
      });
    });

    todayVisits.sort((a, b) => {
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
    });

    console.log('📊 Total combined visits today:', todayVisits.length);

    setAttendanceData(todayVisits);
    updateStatsFromAttendance(todayVisits);
  };

  useEffect(() => {
    if ((memberAttendance.length > 0 || nonMemberVisits.length > 0)) {
      combineAttendanceData();
    }
  }, [memberAttendance, nonMemberVisits, membersData]);

  const updateStatsFromAttendance = (todayVisits: TodayVisit[]) => {
    console.log('📈 Updating stats from attendance:', todayVisits.length);

    const today = new Date().toISOString().split('T')[0];

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

    const activeInGym = todayVisits.filter(v => v.status === 'checked-in');
    const activeMembers = activeInGym.filter(v => v.type === 'member').length;
    const activeNonMembers = activeInGym.filter(v => v.type === 'non-member-daily').length;

    const personalTrainingSessions = todayVisits.filter(v =>
      v.facility?.toLowerCase().includes('training') ||
      v.facility?.toLowerCase().includes('personal') ||
      v.location?.toLowerCase().includes('training') ||
      v.location?.toLowerCase().includes('personal')
    ).length;

    const classAttendances = todayVisits.filter(v =>
      v.facility?.toLowerCase().includes('class') ||
      v.facility?.toLowerCase().includes('yoga') ||
      v.facility?.toLowerCase().includes('studio') ||
      v.location?.toLowerCase().includes('class') ||
      v.location?.toLowerCase().includes('yoga') ||
      v.location?.toLowerCase().includes('studio')
    ).length;

    const todayRevenue = calculateTodayRevenue(memberTransactions, nonMemberTransactions);
    const monthlyRevenue = calculateMonthlyRevenue(memberTransactions, nonMemberTransactions, membersData);

    const now = new Date();
    const activeMembersCount = membersData.filter(member => {
      if (member.status !== 'active') return false;
      if (!member.masa_aktif) return false;
      return new Date(member.masa_aktif) >= now;
    }).length;

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

  const generateVisitorChartData = () => {
    const weeklyData: Array<{ date: string, visitors: number, members: number, nonMembers: number }> = [];
    const monthlyData: Array<{ month: string, visitors: number, revenue: number }> = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const memberVisitsCount = memberAttendance.filter(v => {
        if (!v.checkInTime) return false;
        const visitDate = new Date(v.checkInTime).toISOString().split('T')[0];
        return visitDate === dateStr;
      }).length;

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

  useEffect(() => {
    if (memberAttendance.length > 0 || nonMemberVisits.length > 0) {
      generateVisitorChartData();
    }
  }, [memberAttendance, nonMemberVisits, memberTransactions, nonMemberTransactions, membersData]);

  const calculateMonthlyRevenue = (memberTx: TransactionData[], nmTx: NonMemberTransactionData[], members: MemberData[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const memberRevenue = memberTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);

    const nonMemberRevenue = nmTx.filter(tx => {
      if (tx.status !== 'completed') return false;
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear;
    }).reduce((sum, tx) => sum + (parseFloat(String(tx.jumlah)) || 0), 0);

    const membershipRevenue = members.filter(m => {
      const joinDate = m.createdAt || m.tanggal_daftar;
      if (!joinDate) return false;
      const joinDateObj = joinDate instanceof Date ? joinDate : new Date(joinDate);
      return joinDateObj.getMonth() === currentMonth &&
        joinDateObj.getFullYear() === currentYear;
    }).reduce((sum, m) => sum + (parseFloat(String(m.membership_price)) || 0), 0);

    return memberRevenue + nonMemberRevenue + membershipRevenue;
  };

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

  // Loading state dengan tampilan yang lebih menarik
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-2xl text-center border border-white/30">
          <div className="relative inline-block mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-green-500 border-r-blue-500 border-b-purple-500 border-l-pink-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Memeriksa Autentikasi
          </h2>
          <p className="text-gray-600">Memuat dashboard admin operasional...</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
            <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700 animate-pulse">Mengarahkan...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'from-blue-500 to-cyan-500' },
    { id: 'members', label: 'Manajemen Member', icon: '👥', color: 'from-green-500 to-emerald-500' },
    { id: 'attendance', label: 'Presensi', icon: '📝', color: 'from-purple-500 to-pink-500' },
    { id: 'facilities', label: 'Fasilitas', icon: '🏋️', color: 'from-orange-500 to-red-500' },
    { id: 'reports', label: 'Laporan', icon: '📈', color: 'from-indigo-500 to-violet-500' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Status Bar */}
            <div className="bg-gradient-to-r from-white to-blue-50/50 rounded-2xl p-5 shadow-xl border border-blue-100/50 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap gap-3">
                  <div className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 ${realtimeMode
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    }`}>
                    <span className="text-lg">🔴</span>
                    <span>Realtime: {realtimeMode ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 ${streamConnected
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                    }`}>
                    <span className="text-lg">📡</span>
                    <span>SSE: {streamConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2">
                    <span className="text-lg">🏋️</span>
                    <span>Fasilitas: {facilitiesData.length}</span>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>Member: {membersData.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm text-gray-500 font-medium">Update terakhir:</span>
                    <div className="text-sm font-semibold text-gray-700">
                      {streamLastUpdate.toLocaleTimeString('id-ID')}
                    </div>
                  </div>
                  <button
                    onClick={toggleRealtimeMode}
                    className={`px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all duration-300 transform hover:scale-105 ${realtimeMode
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'
                      }`}
                  >
                    {realtimeMode ? 'Matikan Realtime' : 'Hidupkan Realtime'}
                  </button>
                </div>
              </div>

              {streamError && (
                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <span className="text-red-600 font-medium">{streamError}</span>
                </div>
              )}

              {/* Statistics Grid */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
                  <div className="text-xs text-blue-600 font-semibold">Member Attendance</div>
                  <div className="text-lg font-bold text-blue-700">{memberAttendance.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
                  <div className="text-xs text-green-600 font-semibold">Non-Member Daily</div>
                  <div className="text-lg font-bold text-green-700">{nonMemberVisits.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-100">
                  <div className="text-xs text-purple-600 font-semibold">Facility Activities</div>
                  <div className="text-lg font-bold text-purple-700">{nonMemberFacilityActivities.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-xl border border-orange-100">
                  <div className="text-xs text-orange-600 font-semibold">Active in Gym</div>
                  <div className="text-lg font-bold text-orange-700">
                    {attendanceData.filter(a => a.status === 'checked-in').length}
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📊</span>
                  <span className="font-bold text-indigo-800">Sistem Perhitungan Kunjungan</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
                    <span className="text-sm text-gray-700">
                      <span className="font-bold text-green-600">Check-in harian</span> = +1 kunjungan
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-400 to-gray-500"></div>
                    <span className="text-sm text-gray-700">
                      <span className="font-bold text-gray-600">Pilih/ganti fasilitas</span> = 0 kunjungan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <OperationalStats data={operationalStats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl shadow-xl border border-blue-100/50 p-6">
                <VisitorChart data={visitorData} />
              </div>
              <div className="bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-xl border border-green-100/50 p-6">
                <FacilityStatus data={facilitiesData} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl shadow-xl border border-purple-100/50 p-6">
              <AttendanceTracker
                data={attendanceData}
                membersData={membersData}
                facilityActivityCount={nonMemberFacilityActivities.length}
              />
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-xl border border-green-100/50 p-6 animate-fadeIn">
            <MemberManagement data={membersData} />
          </div>
        );

      case 'attendance':
        return (
          <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl shadow-xl border border-purple-100/50 p-6 animate-fadeIn">
            <AttendanceTracker
              data={attendanceData}
              membersData={membersData}
              detailed
              facilityActivityCount={nonMemberFacilityActivities.length}
            />
          </div>
        );

      case 'facilities':
        return (
          <div className="bg-gradient-to-br from-white to-orange-50/50 rounded-2xl shadow-xl border border-orange-100/50 p-6 animate-fadeIn">
            <FacilityStatus data={facilitiesData} detailed />
          </div>
        );

      case 'reports':
        return (
          <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl shadow-xl border border-indigo-100/50 p-6 animate-fadeIn">
            <ReportsPanel onRefresh={() => window.location.reload()} />
          </div>
        );

      default:
        return (
          <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-xl border border-gray-100/50 p-10 text-center">
            <div className="text-5xl mb-4">🤔</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Tab tidak ditemukan</h3>
            <p className="text-gray-500">Silakan pilih tab yang tersedia di atas</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-emerald-50">
      {/* Header dengan glassmorphism effect */}
      <nav className="bg-white/90 backdrop-blur-lg shadow-2xl sticky top-0 z-40 border-b border-white/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">HS</span>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Operasional
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse"></div>
                  <p className="text-sm text-gray-600">HS Gym Management System - Real-time Dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 animate-pulse"></span>
                  {user.nama || user.username}
                </div>
                <div className="text-xs text-gray-500 px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full capitalize inline-block mt-1">
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:from-red-600 hover:to-orange-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tabs dengan efek gradient */}
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                    }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8">
        {renderTabContent()}
      </main>

      {/* Tambahkan CSS untuk animasi */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}