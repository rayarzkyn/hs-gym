export interface OperationalStatsData {
  todayVisitors: number;
  activeMembers: number;
  currentCapacity: number;
  todayRevenue: number;
  monthlyRevenue: number;
  facilityUsage: number;
  memberCheckins: number;
  nonMemberCheckins: number;
  personalTrainingSessions: number;
  classAttendances: number;
}

export interface OperationalStatsProps {
  data: OperationalStatsData;
}

export interface VisitorData {
  today: {
    total: number;
    members: number;
    nonMembers: number;
    peakHour: string;
  };
  weekly: Array<{
    date: string;
    visitors: number;
    members: number;
    nonMembers: number;
  }>;
  monthly: Array<{
    month: string;
    visitors: number;
    revenue: number;
  }>;
}

export interface Facility {
  id: string;
  name: string;
  status: 'available' | 'maintenance' | 'closed' | 'occupied' | 'cleaning';
  capacity: number;
  currentUsage: number;
  lastMaintenance: string;
  nextMaintenance: string;
  equipment?: Equipment[];
  currentMembers?: number;
  peakHours?: string[];
}

export interface Equipment {
  name: string;
  status: 'good' | 'needs_maintenance' | 'broken';
  count: number;
}

export interface Member {
  createdAt: string | undefined;
  membershipPrice: number;
  id: string;
  nama: string;
  email: string;
  phone?: string;
  telepon?: string;
  membershipType?: string;
  membership_type?: string;
  joinDate?: string;
  tanggal_daftar?: string;
  expiryDate?: string;
  masa_aktif?: string;
  status: 'active' | 'expired' | 'suspended' | 'paid' | 'pending';
  totalVisits?: number;
  lastVisit?: string;
  lastCheckin?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'member' | 'non_member' | 'non-member';
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  facility?: string;
  status?: string;
}

export interface NonMember {
  id: string;
  daily_code: string;
  nama: string;
  email: string;
  telepon: string;
  harga: number;
  payment_method: string;
  status: 'active' | 'expired';
  tanggal_daftar: string;
  expired_at: string;
  created_at: string;
  updated_at: string;
}

// Tambahan untuk chart data
export interface WeeklyDataItem {
  date: string;
  visitors: number;
  members: number;
  nonMembers: number;
}

export interface MonthlyDataItem {
  month: string;
  visitors: number;
  revenue: number;
}

