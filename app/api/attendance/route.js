import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Check-in harian
export async function POST(request) {
  try {
    const { userId, userName, type = 'member' } = await request.json();
    
    if (!userId || !userName) {
      return NextResponse.json(
        { success: false, error: 'User ID dan nama diperlukan' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Cek apakah sudah check-in hari ini
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '==', today),
      where('status', '==', 'checked_in')
    );
    
    const existingAttendance = await getDocs(attendanceQuery);
    
    if (!existingAttendance.empty) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Anda sudah check-in hari ini',
          data: existingAttendance.docs[0].data()
        },
        { status: 400 }
      );
    }

    // Buat attendance baru
    const attendanceData = {
      userId,
      userName,
      date: today,
      checkInTime: serverTimestamp(),
      status: 'checked_in',
      type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const attendanceRef = await addDoc(collection(db, 'attendance'), attendanceData);
    
    return NextResponse.json({
      success: true,
      message: 'Check-in harian berhasil',
      data: {
        id: attendanceRef.id,
        ...attendanceData
      }
    });

  } catch (error) {
    console.error('Attendance check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan check-in' },
      { status: 500 }
    );
  }
}

// Get today's attendance
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const facility = searchParams.get('facility');
    const status = searchParams.get('status');

    let attendanceQuery;
    
    if (userId && date) {
      // Get specific user's attendance for today
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', date)
      );
    } else if (facility && status) {
      // Get attendance count for specific facility
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('facility', '==', facility),
        where('status', '==', status),
        where('date', '==', date)
      );
    } else if (status) {
      // Get all attendance with specific status for today
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('status', '==', status),
        where('date', '==', date)
      );
    } else {
      // Get all attendance for today
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', date)
      );
    }

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceList = attendanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (userId && date) {
      // Return single attendance if exists
      return NextResponse.json({
        success: true,
        data: attendanceList[0] || null,
        exists: attendanceList.length > 0
      });
    } else if (facility && status) {
      // Return count for facility
      return NextResponse.json({
        success: true,
        count: attendanceList.length,
        facility,
        status
      });
    } else {
      // Return all attendance
      return NextResponse.json({
        success: true,
        data: attendanceList,
        total: attendanceList.length
      });
    }

  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data attendance' },
      { status: 500 }
    );
  }
}