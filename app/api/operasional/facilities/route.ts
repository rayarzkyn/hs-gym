import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Starting facilities API...');
    
    let facilitiesData: any[] = [];

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current active visitors untuk capacity calculation
      const activeVisitorsResult: any = await query(`
        SELECT COUNT(*) as active_count 
        FROM visits 
        WHERE DATE(waktu_kunjungan) = ? 
        AND waktu_kunjungan >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      `, [today]);

      const activeVisitors = activeVisitorsResult[0]?.active_count || 0;

      // Mock facilities data berdasarkan setup gym
      facilitiesData = [
        {
          id: '1',
          name: 'Area Cardio',
          status: 'available',
          capacity: 25,
          currentUsage: Math.min(Math.round(activeVisitors * 0.4), 25),
          lastMaintenance: '2024-01-10',
          nextMaintenance: '2024-02-10',
          equipment: [
            { name: 'Treadmill', status: 'good', count: 8 },
            { name: 'Stationary Bike', status: 'good', count: 6 },
            { name: 'Elliptical', status: 'maintenance', count: 2 }
          ]
        },
        {
          id: '2',
          name: 'Area Weight Training',
          status: 'available',
          capacity: 35,
          currentUsage: Math.min(Math.round(activeVisitors * 0.5), 35),
          lastMaintenance: '2024-01-15',
          nextMaintenance: '2024-02-15',
          equipment: [
            { name: 'Dumbbells', status: 'good', count: 15 },
            { name: 'Barbells', status: 'good', count: 8 },
            { name: 'Weight Machines', status: 'good', count: 12 }
          ]
        },
        {
          id: '3',
          name: 'Locker Room',
          status: 'available',
          capacity: 50,
          currentUsage: Math.min(activeVisitors, 50),
          lastMaintenance: '2024-01-20',
          nextMaintenance: '2024-02-20',
          equipment: [
            { name: 'Lockers', status: 'good', count: 50 },
            { name: 'Showers', status: 'good', count: 8 }
          ]
        }
      ];

    } catch (error) {
      console.error('Error fetching facilities data:', error);
    }

    console.log('✅ Facilities API completed successfully');
    return NextResponse.json({
      success: true,
      data: facilitiesData
    });

  } catch (error) {
    console.error('❌ Critical error in facilities API:', error);
    
    return NextResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'Area Cardio',
          status: 'available',
          capacity: 25,
          currentUsage: 0,
          lastMaintenance: '2024-01-10',
          nextMaintenance: '2024-02-10',
          equipment: [
            { name: 'Treadmill', status: 'good', count: 8 },
            { name: 'Stationary Bike', status: 'good', count: 6 }
          ]
        }
      ],
      note: 'Using default data due to critical error'
    });
  }
}