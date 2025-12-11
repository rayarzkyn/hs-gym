// app/api/member/attendance-history/route.js
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export async function GET(request) {
  try {
    console.log('📋 Attendance History API called');

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limitCount = parseInt(searchParams.get('limit') || '20');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching attendance history for:', memberId);

    // Get member data first to check if exists
    const memberRef = collection(db, 'members');
    const memberQuery = query(memberRef, where('nomor_member', '==', memberId));
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
        data: []
      });
    }

    // Try to get from visits collection
    try {
      const visitsRef = collection(db, 'visits');
      const visitsQuery = query(
        visitsRef,
        where('memberId', '==', memberId),
        orderBy('checkinTime', 'desc'),
        limit(limitCount)
      );

      const visitsSnapshot = await getDocs(visitsQuery);

      const attendanceData = visitsSnapshot.docs.map(doc => {
        const data = doc.data();
        const checkinTime = data.checkinTime?.toDate?.() || new Date();

        return {
          id: doc.id,
          date: checkinTime.toISOString().split('T')[0],
          checkInTime: checkinTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          checkOutTime: null,
          facility: data.facility || data.area || 'Gym Area',
          duration: data.duration || '2 jam',
          status: 'checked_out'
        };
      });

      console.log(`✅ Found ${attendanceData.length} attendance records`);

      return NextResponse.json({
        success: true,
        data: attendanceData
      });

    } catch (error) {
      console.log('Error getting visits, trying attendance collection:', error.message);

      // Fallback: try attendance collection
      try {
        const attendanceRef = collection(db, 'attendance');
        const attendanceQuery = query(
          attendanceRef,
          where('userId', '==', memberId),
          orderBy('checkInTime', 'desc'),
          limit(limitCount)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);

        const fallbackData = attendanceSnapshot.docs.map(doc => {
          const data = doc.data();
          const checkinTime = data.checkInTime?.toDate?.() || new Date();

          return {
            id: doc.id,
            date: checkinTime.toISOString().split('T')[0],
            checkInTime: checkinTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            checkOutTime: data.checkOutTime ?
              (data.checkOutTime.toDate?.().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) || '-') :
              null,
            facility: data.facility || 'Gym Area',
            duration: data.duration || '2 jam',
            status: data.status || 'checked_out'
          };
        });

        console.log(`✅ Found ${fallbackData.length} records from attendance collection`);

        return NextResponse.json({
          success: true,
          data: fallbackData
        });

      } catch (fallbackError) {
        console.log('Both attempts failed:', fallbackError.message);

        // Return empty array if no data found
        return NextResponse.json({
          success: true,
          data: []
        });
      }
    }

  } catch (error) {
    console.error('❌ Error in attendance history API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance history',
        message: error.message
      },
      { status: 500 }
    );
  }
}