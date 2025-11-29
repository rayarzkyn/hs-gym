import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'daily';
    
    const today = new Date();
    let startDate, endDate;

    // Tentukan range tanggal berdasarkan report type
    switch (reportType) {
      case 'daily':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
    }

    // Get attendance data dalam range
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('checkInTime', '>=', Timestamp.fromDate(startDate)),
      where('checkInTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('checkInTime', 'desc')
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceData = attendanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkInTime: doc.data().checkInTime?.toDate?.()?.toISOString() || doc.data().checkInTime,
    }));

    // Get members data
    const membersQuery = query(collection(db, 'members'));
    const membersSnapshot = await getDocs(membersQuery);
    const membersData = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate statistics
    const totalVisitors = attendanceData.length;
    const memberVisitors = attendanceData.filter(a => a.type === 'member').length;
    const nonMemberVisitors = attendanceData.filter(a => a.type === 'non_member' || a.type === 'non-member').length;
    const totalRevenue = nonMemberVisitors * 25000; // Asumsi harga non-member
    const activeMembers = membersData.filter(m => m.status === 'active' || m.status === 'paid').length;

    // Generate report data
    const reportData = {
      period: reportType === 'daily' 
        ? today.toLocaleDateString('id-ID')
        : reportType === 'weekly'
        ? 'Minggu Ini'
        : reportType === 'monthly'
        ? today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        : today.getFullYear().toString(),
      totalVisitors,
      totalRevenue,
      activeMembers,
      newMembers: Math.floor(Math.random() * 10) + 1, // Simulasi member baru
      facilityUsage: Math.floor(Math.random() * 30) + 50, // 50-80%
      peakHours: ['18:00-19:00', '19:00-20:00', '07:00-08:00'],
      popularFacilities: [
        { name: 'Area Cardio', usage: Math.floor(totalVisitors * 0.65), percentage: 65 },
        { name: 'Area Weight Training', usage: Math.floor(totalVisitors * 0.54), percentage: 54 },
        { name: 'Studio Yoga', usage: Math.floor(totalVisitors * 0.35), percentage: 35 }
      ],
      memberVisitors,
      nonMemberVisitors,
      totalTransactions: totalVisitors
    };

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { reportType, startDate, endDate, format } = body;

    // Simulasi processing report
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      message: `Report ${reportType} generated successfully in ${format} format`,
      downloadUrl: null // Dalam implementasi real, return URL download
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create report' },
      { status: 500 }
    );
  }
}