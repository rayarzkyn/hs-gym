import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Starting stats API...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Default values
    const defaultStats = {
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

    try {
      // Test database connection first
      await query('SELECT 1 as test');
      console.log('✅ Database connection test passed');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json({
        success: true,
        data: defaultStats,
        note: 'Database connection failed, using default data'
      });
    }

    let todayVisitors = 0;
    let activeMembers = 0;
    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let memberCheckins = 0;
    let nonMemberCheckins = 0;
    let currentVisitors = 0;

    // Query untuk pengunjung hari ini
    try {
      const todayVisitorsResult: any = await query(
        `SELECT COUNT(*) as count FROM visits WHERE DATE(waktu_kunjungan) = ?`,
        [today]
      );
      todayVisitors = todayVisitorsResult[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching today visitors:', error);
    }

    // Query untuk member aktif
    try {
      const activeMembersResult: any = await query(
        `SELECT COUNT(*) as count FROM members WHERE status_pembayaran = 'paid' AND masa_aktif >= CURDATE()`
      );
      activeMembers = activeMembersResult[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching active members:', error);
    }

    // Query untuk pendapatan hari ini
    try {
      const todayRevenueResult: any = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM transactions WHERE DATE(waktu_transaksi) = ? AND status_pembayaran = 'paid'`,
        [today]
      );
      todayRevenue = todayRevenueResult[0]?.total || 0;
    } catch (error) {
      console.error('Error fetching today revenue:', error);
    }

    // Query untuk pendapatan bulan ini
    try {
      const monthlyRevenueResult: any = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM transactions WHERE MONTH(waktu_transaksi) = MONTH(CURDATE()) AND YEAR(waktu_transaksi) = YEAR(CURDATE()) AND status_pembayaran = 'paid'`
      );
      monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }

    // Query untuk checkin member
    try {
      const memberCheckinsResult: any = await query(
        `SELECT COUNT(*) as count FROM visits WHERE DATE(waktu_kunjungan) = ? AND jenis_pengunjung = 'member'`,
        [today]
      );
      memberCheckins = memberCheckinsResult[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching member checkins:', error);
    }

    // Query untuk checkin non-member
    try {
      const nonMemberCheckinsResult: any = await query(
        `SELECT COUNT(*) as count FROM visits WHERE DATE(waktu_kunjungan) = ? AND jenis_pengunjung = 'non-member'`,
        [today]
      );
      nonMemberCheckins = nonMemberCheckinsResult[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching non-member checkins:', error);
    }

    // Query untuk pengunjung saat ini
    try {
      const currentVisitorsResult: any = await query(
        `SELECT COUNT(*) as count FROM visits WHERE DATE(waktu_kunjungan) = ? AND waktu_kunjungan >= DATE_SUB(NOW(), INTERVAL 2 HOUR)`,
        [today]
      );
      currentVisitors = currentVisitorsResult[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching current visitors:', error);
    }

    const currentCapacity = Math.min(Math.round((currentVisitors / 50) * 100), 100);

    const stats = {
      todayVisitors,
      activeMembers,
      currentCapacity,
      todayRevenue,
      monthlyRevenue,
      facilityUsage: currentCapacity,
      memberCheckins,
      nonMemberCheckins,
      personalTrainingSessions: 0,
      classAttendances: 0
    };

    console.log('✅ Stats API completed successfully');

    return NextResponse.json({
      success: true,
      data: stats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Critical error in stats API:', error);
    
    return NextResponse.json({
      success: true,
      data: {
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
      note: 'Using default data due to critical error'
    });
  }
}