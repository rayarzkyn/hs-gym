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
    const facility = searchParams.get('facility');
    const status = searchParams.get('status') || 'checked_in';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Nama fasilitas diperlukan' },
        { status: 400 }
      );
    }

    // Query attendance untuk fasilitas tertentu hari ini
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('facility', '==', facility),
      where('status', '==', status),
      where('date', '==', date)
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);

    return NextResponse.json({
      success: true,
      count: attendanceSnapshot.size,
      facility,
      status,
      date
    });

  } catch (error) {
    console.error('Error fetching facility attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data fasilitas' },
      { status: 500 }
    );
  }
}