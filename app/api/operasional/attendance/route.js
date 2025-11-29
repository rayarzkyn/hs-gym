import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  orderBy 
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    let attendanceQuery;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
    } else {
      // Get today's attendance by default
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('date', 'desc')
      );
    }
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    const attendance = attendanceSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string
        date: data.date?.toDate?.()?.toISOString() || data.date,
        checkInTime: data.checkInTime?.toDate?.()?.toISOString() || data.checkInTime,
        checkOutTime: data.checkOutTime?.toDate?.()?.toISOString() || data.checkOutTime,
      };
    });

    return NextResponse.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}