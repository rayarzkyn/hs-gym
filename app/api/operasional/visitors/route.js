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

    const memberCheckins = todayAttendance.filter(a => a.type === 'member').length;
    const nonMemberCheckins = todayAttendance.filter(a => a.type === 'non_member').length;

    // Generate weekly data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      weeklyData.push({
        date: date.toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 50) + 20,
        members: Math.floor(Math.random() * 30) + 10,
        nonMembers: Math.floor(Math.random() * 20) + 5
      });
    }

    const visitors = {
      today: {
        total: memberCheckins + nonMemberCheckins,
        members: memberCheckins,
        nonMembers: nonMemberCheckins,
        peakHour: '18:00-19:00'
      },
      weekly: weeklyData,
      monthly: []
    };

    return NextResponse.json({
      success: true,
      data: visitors
    });
  } catch (error) {
    console.error('Error fetching visitors data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch visitors data' },
      { status: 500 }
    );
  }
}