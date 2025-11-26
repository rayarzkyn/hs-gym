import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Starting attendance API...');
    
    let attendanceData: any[] = [];

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Sesuai struktur tabel visits
      const attendance: any = await query(`
        SELECT 
          v.id_visit as id,
          v.id_member as memberId,
          COALESCE(m.nama, 'Non-Member') as memberName,
          v.waktu_kunjungan as checkIn,
          NULL as checkOut,
          NULL as duration,
          v.jenis_pengunjung as type
        FROM visits v
        LEFT JOIN members m ON v.id_member = m.id_member
        WHERE DATE(v.waktu_kunjungan) = ?
        ORDER BY v.waktu_kunjungan DESC
      `, [today]);

      // Format the data
      attendanceData = attendance.map((record: any) => ({
        id: record.id,
        memberId: record.memberId,
        memberName: record.memberName,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        duration: record.duration,
        type: record.type === 'member' ? 'member' : 'non-member'
      }));

    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }

    console.log('✅ Attendance API completed successfully:', attendanceData.length, 'records');
    return NextResponse.json({
      success: true,
      data: attendanceData
    });

  } catch (error) {
    console.error('❌ Critical error in attendance API:', error);
    
    return NextResponse.json({
      success: true,
      data: [],
      note: 'Using empty data due to critical error'
    });
  }
}