import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
    
    const facilities = facilitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If no facilities in database, return default data
    if (facilities.length === 0) {
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
          },
          {
            id: '2',
            name: 'Area Weight Training',
            status: 'available',
            capacity: 35,
            currentUsage: 0,
            lastMaintenance: '2024-01-15',
            nextMaintenance: '2024-02-15',
            equipment: [
              { name: 'Dumbbells', status: 'good', count: 15 },
              { name: 'Barbells', status: 'good', count: 8 }
            ]
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      data: facilities
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch facilities data' },
      { status: 500 }
    );
  }
}