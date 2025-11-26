export interface OperationalStats {
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

export interface VisitorData {
  today: {
    total: number;
    members: number;
    nonMembers: number;
    peakHour: string;
  };
  weekly: Array<{
    day: string;
    visitors: number;
    members: number;
    nonMembers: number;
  }>;
  monthly: Array<{
    month: string;
    visitors: number;
    growth: number;
  }>;
}

export interface Facility {
  id: string;
  name: string;
  status: 'available' | 'maintenance' | 'occupied' | 'cleaning';
  capacity: number;
  currentUsage: number;
  lastMaintenance: string;
  nextMaintenance: string;
  equipment: Array<{
    name: string;
    status: string;
    count: number;
  }>;
}

export interface Member {
  id: string;
  nama: string;
  membershipType: string;
  joinDate: string;
  expiryDate: string;
  status: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalVisits: number;
  ecardCode?: string;
}

export interface Attendance {
  id: string;
  memberId: string | null;
  memberName: string;
  checkIn: string;
  checkOut: string | null;
  duration: number | null;
  type: 'member' | 'non-member';
}

// Props interfaces untuk komponen
export interface OperationalStatsProps {
  data: OperationalStats;
}

export interface VisitorChartProps {
  data: VisitorData;
}

export interface MemberManagementProps {
  data: Member[];
}

export interface FacilityStatusProps {
  data: Facility[];
  detailed?: boolean;
}

export interface AttendanceTrackerProps {
  data: Attendance[];
  detailed?: boolean;
}

export interface QuickActionsProps {
  // Tambahkan props jika diperlukan
}

export interface ReportData {
  period: string;
  totalVisitors: number;
  totalRevenue: number;
  activeMembers: number;
  newMembers: number;
  facilityUsage: number;
  peakHours: string[];
  popularFacilities: Array<{
    name: string;
    usage: number;
    percentage: number;
  }>;
}

export interface ReportRequest {
  reportType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  format: 'pdf' | 'excel' | 'csv';
}