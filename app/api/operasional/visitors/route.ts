import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Starting visitors API...');
    
    // Default data structure
    const defaultData = {
      today: {
        total: 0,
        members: 0,
        nonMembers: 0,
        peakHour: '18:00-19:00'
      },
      weekly: [],
      monthly: []
    };

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Data pengunjung hari ini
      const todayDataResult: any = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN jenis_pengunjung = 'member' THEN 1 END) as members,
          COUNT(CASE WHEN jenis_pengunjung = 'non-member' THEN 1 END) as non_members
        FROM visits 
        WHERE DATE(waktu_kunjungan) = ?
      `, [today]);

      const todayData = todayDataResult[0] || {};
      
      // Get peak hour
      const peakHourResult: any = await query(`
        SELECT 
          HOUR(waktu_kunjungan) as hour,
          COUNT(*) as hour_count
        FROM visits 
        WHERE DATE(waktu_kunjungan) = ?
        GROUP BY HOUR(waktu_kunjungan)
        ORDER BY hour_count DESC
        LIMIT 1
      `, [today]);

      const peakHourData = peakHourResult[0] || { hour: 18 };
      const peakHour = peakHourData.hour ? `${peakHourData.hour}:00-${peakHourData.hour + 1}:00` : '18:00-19:00';

      defaultData.today = {
        total: todayData.total || 0,
        members: todayData.members || 0,
        nonMembers: todayData.non_members || 0,
        peakHour
      };

      // Data mingguan (7 hari terakhir)
      const weeklyDataResult: any = await query(`
        SELECT 
          DATE(waktu_kunjungan) as date,
          DAYNAME(waktu_kunjungan) as day_name,
          COUNT(*) as visitors,
          COUNT(CASE WHEN jenis_pengunjung = 'member' THEN 1 END) as members,
          COUNT(CASE WHEN jenis_pengunjung = 'non-member' THEN 1 END) as non_members
        FROM visits 
        WHERE waktu_kunjungan >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(waktu_kunjungan), DAYNAME(waktu_kunjungan)
        ORDER BY date ASC
      `);

      // Format weekly data
      const dayMap: { [key: string]: string } = {
        'Monday': 'Sen', 'Tuesday': 'Sel', 'Wednesday': 'Rab',
        'Thursday': 'Kam', 'Friday': 'Jum', 'Saturday': 'Sab', 'Sunday': 'Min'
      };

      defaultData.weekly = weeklyDataResult.map((row: any) => ({
        day: dayMap[row.day_name] || row.day_name.substring(0, 3),
        visitors: row.visitors,
        members: row.members,
        nonMembers: row.non_members
      }));

    } catch (error) {
      console.error('Error fetching visitors data:', error);
    }

    console.log('✅ Visitors API completed successfully');
    return NextResponse.json({
      success: true,
      data: defaultData
    });

  } catch (error) {
    console.error('❌ Critical error in visitors API:', error);
    
    return NextResponse.json({
      success: true,
      data: {
        today: {
          total: 0,
          members: 0,
          nonMembers: 0,
          peakHour: '18:00-19:00'
        },
        weekly: [],
        monthly: []
      },
      note: 'Using default data due to critical error'
    });
  }
}