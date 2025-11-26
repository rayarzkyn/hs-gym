import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Interface untuk hasil query
interface QueryResult {
  [key: string]: any;
}

interface VisitorData {
  totalVisitors: number;
  memberVisitors: number;
  nonMemberVisitors: number;
}

interface RevenueData {
  totalRevenue: number;
  totalTransactions: number;
}

interface MemberData {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
}

interface PeakHourData {
  hour: number;
  usageCount: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportType, startDate, endDate, format = 'pdf' } = body;

    console.log(`📊 Generating ${reportType} report...`);

    let dateCondition = '';
    let dateParams: any[] = [];

    // Set date range berdasarkan report type
    switch (reportType) {
      case 'daily':
        const today = startDate || new Date().toISOString().split('T')[0];
        dateCondition = 'DATE(waktu_kunjungan) = ?';
        dateParams = [today];
        break;
      
      case 'weekly':
        const weekStart = startDate || new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
        dateCondition = 'DATE(waktu_kunjungan) BETWEEN ? AND ?';
        dateParams = [weekStart, endDate || new Date().toISOString().split('T')[0]];
        break;
      
      case 'monthly':
        const monthStart = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        dateCondition = 'DATE(waktu_kunjungan) BETWEEN ? AND ?';
        dateParams = [monthStart, monthEnd];
        break;
      
      case 'yearly':
        const yearStart = startDate || `${new Date().getFullYear()}-01-01`;
        const yearEnd = endDate || `${new Date().getFullYear()}-12-31`;
        dateCondition = 'DATE(waktu_kunjungan) BETWEEN ? AND ?';
        dateParams = [yearStart, yearEnd];
        break;
      
      default:
        dateCondition = 'DATE(waktu_kunjungan) = ?';
        dateParams = [new Date().toISOString().split('T')[0]];
    }

    // Data utama untuk laporan
    const [
      visitorsData,
      revenueData,
      membersData,
      peakHoursData
    ] = await Promise.all([
      // Total pengunjung
      query(`
        SELECT 
          COUNT(*) as totalVisitors,
          COUNT(CASE WHEN jenis_pengunjung = 'member' THEN 1 END) as memberVisitors,
          COUNT(CASE WHEN jenis_pengunjung = 'non-member' THEN 1 END) as nonMemberVisitors
        FROM visits 
        WHERE ${dateCondition}
      `, dateParams),

      // Total pendapatan
      query(`
        SELECT 
          COALESCE(SUM(total), 0) as totalRevenue,
          COUNT(*) as totalTransactions
        FROM transactions 
        WHERE ${dateCondition.replace('waktu_kunjungan', 'waktu_transaksi')} 
        AND status_pembayaran = 'paid'
      `, dateParams),

      // Data member
      query(`
        SELECT 
          COUNT(*) as totalMembers,
          COUNT(CASE WHEN status_pembayaran = 'paid' AND masa_aktif >= CURDATE() THEN 1 END) as activeMembers,
          COUNT(CASE WHEN DATE(tanggal_daftar) BETWEEN ? AND ? THEN 1 END) as newMembers
        FROM members
      `, dateParams.length === 2 ? [dateParams[0], dateParams[1]] : [dateParams[0], dateParams[0]]),

      // Jam puncak
      query(`
        SELECT 
          HOUR(waktu_kunjungan) as hour,
          COUNT(*) as usageCount
        FROM visits 
        WHERE ${dateCondition}
        GROUP BY HOUR(waktu_kunjungan)
        ORDER BY usageCount DESC
        LIMIT 3
      `, dateParams)
    ]);

    // Type assertion dengan interface
    const visitors = (visitorsData as QueryResult[])[0] as VisitorData || {
      totalVisitors: 0,
      memberVisitors: 0,
      nonMemberVisitors: 0
    };

    const revenue = (revenueData as QueryResult[])[0] as RevenueData || {
      totalRevenue: 0,
      totalTransactions: 0
    };

    const members = (membersData as QueryResult[])[0] as MemberData || {
      totalMembers: 0,
      activeMembers: 0,
      newMembers: 0
    };

    const peakHours = peakHoursData as PeakHourData[] || [];

    // Format peak hours
    const formattedPeakHours = peakHours.map((hour: PeakHourData) => 
      `${hour.hour}:00-${hour.hour + 1}:00`
    );

    // Data fasilitas populer
    const popularFacilities = [
      { 
        name: 'Area Weight Training', 
        usage: Math.round(visitors.totalVisitors * 0.6), 
        percentage: 60 
      },
      { 
        name: 'Area Cardio', 
        usage: Math.round(visitors.totalVisitors * 0.4), 
        percentage: 40 
      },
      { 
        name: 'Locker Room', 
        usage: Math.round(visitors.totalVisitors * 0.8), 
        percentage: 80 
      }
    ];

    const reportData = {
      period: reportType,
      totalVisitors: visitors.totalVisitors,
      totalRevenue: revenue.totalRevenue,
      activeMembers: members.activeMembers,
      newMembers: members.newMembers,
      facilityUsage: Math.round((visitors.totalVisitors / 100) * 100),
      peakHours: formattedPeakHours,
      popularFacilities,
      memberVisitors: visitors.memberVisitors,
      nonMemberVisitors: visitors.nonMemberVisitors,
      totalTransactions: revenue.totalTransactions
    };

    console.log('✅ Report generated successfully');

    return NextResponse.json({
      success: true,
      data: reportData,
      reportType,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/operasional/reports/download?type=${reportType}&format=${format}&timestamp=${Date.now()}`
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gagal membuat laporan' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'daily';
    
    // Generate quick report untuk preview
    const quickReport = await generateQuickReport(reportType);
    
    return NextResponse.json({
      success: true,
      data: quickReport
    });
    
  } catch (error) {
    console.error('Error in reports GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

async function generateQuickReport(reportType: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [visitorsResult, revenueResult] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM visits WHERE DATE(waktu_kunjungan) = ?`, [today]),
      query(`SELECT COALESCE(SUM(total), 0) as total FROM transactions WHERE DATE(waktu_transaksi) = ? AND status_pembayaran = 'paid'`, [today])
    ]);

    // Type assertion untuk quick report
    const visitors = (visitorsResult as QueryResult[])[0] as { count: number } || { count: 0 };
    const revenue = (revenueResult as QueryResult[])[0] as { total: number } || { total: 0 };

    return {
      period: reportType,
      totalVisitors: visitors.count,
      totalRevenue: revenue.total,
      activeMembers: 0,
      newMembers: 0,
      facilityUsage: 65,
      peakHours: ['18:00-19:00', '19:00-20:00', '07:00-08:00'],
      popularFacilities: [
        { name: 'Area Weight Training', usage: 45, percentage: 65 },
        { name: 'Area Cardio', usage: 32, percentage: 46 },
        { name: 'Locker Room', usage: 68, percentage: 97 }
      ],
      memberVisitors: Math.round(visitors.count * 0.6),
      nonMemberVisitors: Math.round(visitors.count * 0.4),
      totalTransactions: Math.round(visitors.count * 0.8)
    };
  } catch (error) {
    console.error('Error generating quick report:', error);
    
    // Return default data jika ada error
    return {
      period: reportType,
      totalVisitors: 0,
      totalRevenue: 0,
      activeMembers: 0,
      newMembers: 0,
      facilityUsage: 0,
      peakHours: ['18:00-19:00', '19:00-20:00', '07:00-08:00'],
      popularFacilities: [
        { name: 'Area Weight Training', usage: 0, percentage: 0 },
        { name: 'Area Cardio', usage: 0, percentage: 0 },
        { name: 'Locker Room', usage: 0, percentage: 0 }
      ],
      memberVisitors: 0,
      nonMemberVisitors: 0,
      totalTransactions: 0
    };
  }
}