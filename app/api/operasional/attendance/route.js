import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const userType = searchParams.get('userType') || 'all'; // 'member', 'non-member', 'all'
    const status = searchParams.get('status') || 'all'; // 'active', 'completed', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = parseInt(searchParams.get('limit') || '50');

    let targetDate = new Date();
    if (dateParam) {
      targetDate = new Date(dateParam);
    }

    // Set waktu untuk hari tersebut
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('📅 Fetching attendance for:', targetDate.toDateString());

    // **PERBAIKAN UTAMA: Hanya ambil DAILY CHECKINS untuk non-member**
    let attendanceList = [];
    let total = 0;

    // Handle non-member attendance (DAILY CHECKINS ONLY)
    if (userType === 'non-member' || userType === 'all') {
      // **INI KUNCI: hanya ambil yang login_type = 'non_member_daily'**
      let nonMemberQuery = query(
        collection(db, 'non_member_visits'),
        where('login_type', '==', 'non_member_daily'), // ✅ INI HARUS ADA
        where('checkin_time', '>=', Timestamp.fromDate(startOfDay)),
        where('checkin_time', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('checkin_time', 'desc')
      );

      // Filter by status jika diperlukan
      if (status !== 'all') {
        nonMemberQuery = query(
          nonMemberQuery,
          where('status', '==', status)
        );
      }

      const nonMemberSnapshot = await getDocs(nonMemberQuery);

      // **PERBAIKAN: Dapatkan data non-member yang lengkap**
      for (const visitDoc of nonMemberSnapshot.docs) {
        const visitData = visitDoc.data();

        // Cari data non-member untuk info lengkap
        const memberQuery = query(
          collection(db, 'non_members'),
          where('username', '==', visitData.username)
        );

        const memberSnapshot = await getDocs(memberQuery);
        let memberInfo = {};

        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          memberInfo = memberDoc.data();
        }

        // Format data attendance
        attendanceList.push({
          id: visitDoc.id,
          type: 'non-member-daily',
          username: visitData.username,
          daily_code: visitData.daily_code || memberInfo.daily_code || '',
          nama: visitData.nama || memberInfo.nama || visitData.username,
          email: memberInfo.email || '',
          telepon: memberInfo.telepon || '',
          checkin_time: visitData.checkin_time?.toDate?.()?.toISOString() || visitData.checkin_time,
          checkout_time: visitData.checkout_time?.toDate?.()?.toISOString() || visitData.checkout_time,
          duration: visitData.duration || null,
          status: visitData.status || 'active',
          location: visitData.location || 'Main Gym Area',
          login_type: visitData.login_type,
          manual_checkin: visitData.manual_checkin || false,
          facility_name: null, // Daily checkin tidak punya facility
          facility_id: null,
          activity_type: 'daily_checkin', // Tandai sebagai checkin harian
          is_facility_activity: false // ✅ Tandai ini BUKAN aktivitas fasilitas
        });
      }

      console.log(`✅ Found ${nonMemberSnapshot.docs.length} non-member DAILY checkins`);
    }

    // Handle member attendance (jika ada)
    if (userType === 'member' || userType === 'all') {
      try {
        let memberQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          orderBy('date', 'desc')
        );

        const memberSnapshot = await getDocs(memberQuery);

        for (const attendanceDoc of memberSnapshot.docs) {
          const attendanceData = attendanceDoc.data();

          attendanceList.push({
            id: attendanceDoc.id,
            type: 'member',
            username: attendanceData.username || attendanceData.member_id || '',
            nama: attendanceData.nama || attendanceData.name || '',
            email: attendanceData.email || '',
            telepon: attendanceData.telepon || attendanceData.phone || '',
            checkin_time: attendanceData.date?.toDate?.()?.toISOString() || attendanceData.date,
            checkout_time: attendanceData.checkout_time?.toDate?.()?.toISOString() || attendanceData.checkout_time,
            duration: attendanceData.duration || null,
            status: attendanceData.status || 'completed',
            location: attendanceData.location || 'Gym',
            login_type: 'member_daily',
            manual_checkin: true,
            facility_name: null,
            facility_id: null,
            activity_type: 'daily_checkin',
            is_facility_activity: false
          });
        }

        console.log(`✅ Found ${memberSnapshot.docs.length} member checkins`);
      } catch (error) {
        console.log('No member attendance data or different schema:', error.message);
      }
    }

    // **PERBAIKAN: Urutkan berdasarkan waktu checkin**
    attendanceList.sort((a, b) => {
      const timeA = new Date(a.checkin_time || 0);
      const timeB = new Date(b.checkin_time || 0);
      return timeB - timeA; // descending
    });

    // Pagination
    const startIndex = (page - 1) * limitParam;
    const endIndex = startIndex + limitParam;
    const paginatedData = attendanceList.slice(startIndex, endIndex);

    // Stats calculation
    const stats = {
      total: attendanceList.length,
      non_member_daily: attendanceList.filter(a => a.type === 'non-member-daily').length,
      member: attendanceList.filter(a => a.type === 'member').length,
      active: attendanceList.filter(a => a.status === 'active').length,
      completed: attendanceList.filter(a => a.status === 'completed').length,
      with_facility: attendanceList.filter(a => a.is_facility_activity).length
    };

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit: limitParam,
        total: attendanceList.length,
        totalPages: Math.ceil(attendanceList.length / limitParam),
        hasNext: endIndex < attendanceList.length,
        hasPrev: page > 1
      },
      stats: stats,
      filters: {
        date: targetDate.toISOString().split('T')[0],
        userType,
        status
      },
      note: '✅ Non-member hanya menghitung checkin harian (login_type: non_member_daily). Aktivitas fasilitas TIDAK termasuk.'
    });

  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch attendance data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, attendanceId, checkoutTime } = body;

    if (!action || !attendanceId) {
      return NextResponse.json({
        success: false,
        error: 'Action and attendanceId are required'
      }, { status: 400 });
    }

    switch (action) {
      case 'checkout':
        // **PERBAIKAN: Checkout hanya untuk daily checkins, bukan facility activities**
        const attendanceRef = doc(db, 'non_member_visits', attendanceId);
        const attendanceDoc = await getDoc(attendanceRef);

        if (!attendanceDoc.exists()) {
          return NextResponse.json({
            success: false,
            error: 'Attendance record not found'
          }, { status: 404 });
        }

        const attendanceData = attendanceDoc.data();

        // **PERBAIKAN: Pastikan ini adalah daily checkin, bukan facility activity**
        if (attendanceData.login_type !== 'non_member_daily') {
          return NextResponse.json({
            success: false,
            error: 'Cannot checkout facility activity. Use leave facility instead.'
          }, { status: 400 });
        }

        const now = new Date();
        const checkinTime = attendanceData.checkin_time?.toDate?.() || new Date(attendanceData.checkin_time);
        const durationMs = now.getTime() - checkinTime.getTime();

        // Format duration
        let durationText;
        if (durationMs < 60000) {
          durationText = `${Math.floor(durationMs / 1000)} detik`;
        } else if (durationMs < 3600000) {
          durationText = `${Math.floor(durationMs / 60000)} menit`;
        } else {
          const hours = Math.floor(durationMs / 3600000);
          const minutes = Math.floor((durationMs % 3600000) / 60000);
          durationText = `${hours}.${minutes} jam`;
        }

        // Update record
        await updateDoc(attendanceRef, {
          status: 'completed',
          checkout_time: Timestamp.fromDate(now),
          duration: durationText,
          updated_at: Timestamp.now()
        });

        // **PERBAIKAN: Juga update di non_members collection**
        const memberQuery = query(
          collection(db, 'non_members'),
          where('username', '==', attendanceData.username)
        );

        const memberSnapshot = await getDocs(memberQuery);
        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          await updateDoc(doc(db, 'non_members', memberDoc.id), {
            active_visit: false,
            manual_checkin: false,
            current_facility: null,
            current_facility_name: null,
            last_checkout: Timestamp.now(),
            updated_at: Timestamp.now()
          });
        }

        console.log(`✅ Checkout completed for ${attendanceData.username}`);

        return NextResponse.json({
          success: true,
          message: 'Checkout completed successfully',
          data: {
            duration: durationText,
            checkout_time: now.toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in attendance POST:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process attendance action'
    }, { status: 500 });
  }
}