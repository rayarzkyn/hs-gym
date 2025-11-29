import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's attendance
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '>=', Timestamp.fromDate(today)),
      where('date', '<=', Timestamp.fromDate(todayEnd))
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const todayAttendance = attendanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get active members
    const membersQuery = query(
      collection(db, 'members'),
      where('status', '==', 'active')
    );
    const membersSnapshot = await getDocs(membersQuery);
    
    // Get facilities data
    const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));

    const memberCheckins = todayAttendance.filter(a => a.type === 'member').length;
    const nonMemberCheckins = todayAttendance.filter(a => a.type === 'non_member').length;
    
    const facilities = facilitiesSnapshot.docs.map(doc => doc.data());
    const totalCapacity = facilities.reduce((sum, facility) => sum + (facility.capacity || 0), 0);
    const currentUsage = facilities.reduce((sum, facility) => sum + (facility.currentUsage || 0), 0);

    const stats = {
      todayVisitors: memberCheckins + nonMemberCheckins,
      activeMembers: membersSnapshot.size,
      currentCapacity: totalCapacity > 0 ? Math.round((currentUsage / totalCapacity) * 100) : 0,
      todayRevenue: memberCheckins * 50000 + nonMemberCheckins * 75000,
      monthlyRevenue: 0,
      facilityUsage: totalCapacity > 0 ? Math.round((currentUsage / totalCapacity) * 100) : 0,
      memberCheckins,
      nonMemberCheckins,
      personalTrainingSessions: todayAttendance.filter(a => a.facility === 'personal_training').length,
      classAttendances: todayAttendance.filter(a => a.facility === 'class_room').length
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operational stats' },
      { status: 500 }
    );
  }
}