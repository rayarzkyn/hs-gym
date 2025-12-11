import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID diperlukan' },
        { status: 400 }
      );
    }

    // Query attendance untuk user hari ini
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '==', date)
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);

    if (attendanceSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: null,
        exists: false
      });
    }

    const attendanceData = attendanceSnapshot.docs[0].data();
    const attendanceId = attendanceSnapshot.docs[0].id;

    return NextResponse.json({
      success: true,
      data: {
        id: attendanceId,
        ...attendanceData,
        checkInTime: attendanceData.checkInTime?.toDate?.() || new Date()
      },
      exists: true
    });

  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data attendance' },
      { status: 500 }
    );
  }
}