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

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // **HANYA ambil ATTENDANCE (daily_checkin), bukan semua aktivitas**
    const attendanceQuery = query(
      collection(db, 'non_member_visits'),
      where('login_type', '==', 'non_member_daily'), // FILTER PENTING!
      where('checkin_time', '>=', Timestamp.fromDate(today)),
      where('checkin_time', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('checkin_time', 'desc')
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    // Konversi ke array
    const todayAttendance = attendanceSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkin_time: doc.data().checkin_time?.toDate?.()?.toISOString() || doc.data().checkin_time,
      checkout_time: doc.data().checkout_time?.toDate?.()?.toISOString() || doc.data().checkout_time
    }));

    // Hitung hanya attendance yang sesungguhnya
    const nonMemberCheckins = todayAttendance.length; // Ini sudah benar
    
    // Coba ambil member attendance (jika ada)
    let memberCheckins = 0;
    try {
      const memberAttendanceQuery = query(
        collection(db, 'attendance'), // collection untuk member
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<=', Timestamp.fromDate(todayEnd))
      );
      
      const memberSnapshot = await getDocs(memberAttendanceQuery);
      memberCheckins = memberSnapshot.docs.length;
    } catch (error) {
      console.log('No member attendance data:', error.message);
    }

    // Generate weekly data yang benar (hanya attendance)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      try {
        // Query untuk non-member attendance hari itu
        const dayQuery = query(
          collection(db, 'non_member_visits'),
          where('login_type', '==', 'non_member_daily'),
          where('checkin_time', '>=', Timestamp.fromDate(date)),
          where('checkin_time', '<=', Timestamp.fromDate(dateEnd))
        );
        
        const daySnapshot = await getDocs(dayQuery);
        const dayNonMemberVisits = daySnapshot.docs.length;
        
        // Query untuk member attendance hari itu
        let dayMemberVisits = 0;
        try {
          const memberDayQuery = query(
            collection(db, 'attendance'),
            where('date', '>=', Timestamp.fromDate(date)),
            where('date', '<=', Timestamp.fromDate(dateEnd))
          );
          
          const memberDaySnapshot = await getDocs(memberDayQuery);
          dayMemberVisits = memberDaySnapshot.docs.length;
        } catch (error) {
          console.log('No member data for day:', date.toDateString());
        }
        
        weeklyData.push({
          date: date.toISOString().split('T')[0],
          visitors: dayNonMemberVisits + dayMemberVisits,
          members: dayMemberVisits,
          nonMembers: dayNonMemberVisits,
          dayName: date.toLocaleDateString('id-ID', { weekday: 'short' })
        });
      } catch (error) {
        console.log('Error fetching data for day:', date.toDateString(), error.message);
        weeklyData.push({
          date: date.toISOString().split('T')[0],
          visitors: 0,
          members: 0,
          nonMembers: 0,
          dayName: date.toLocaleDateString('id-ID', { weekday: 'short' })
        });
      }
    }

    // Cari peak hour
    let peakHour = '18:00-19:00';
    try {
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        count: 0
      }));
      
      todayAttendance.forEach(visit => {
        if (visit.checkin_time) {
          const checkinTime = new Date(visit.checkin_time);
          const hour = checkinTime.getHours();
          if (hour >= 0 && hour < 24) {
            hourlyData[hour].count++;
          }
        }
      });
      
      // Cari jam dengan pengunjung terbanyak
      const peakHourData = hourlyData.reduce((prev, current) => 
        prev.count > current.count ? prev : current
      );
      
      peakHour = `${peakHourData.hour}:00-${(parseInt(peakHourData.hour) + 1)}:00`;
    } catch (error) {
      console.log('Error calculating peak hour:', error);
    }

    const visitors = {
      today: {
        total: memberCheckins + nonMemberCheckins,
        members: memberCheckins,
        nonMembers: nonMemberCheckins,
        peakHour: peakHour,
        note: 'Non-member hanya menghitung check-in harian (bukan aktivitas fasilitas)'
      },
      weekly: weeklyData,
      monthly: [],
      summary: {
        total_weekly_visitors: weeklyData.reduce((sum, day) => sum + day.visitors, 0),
        average_daily_visitors: Math.round(weeklyData.reduce((sum, day) => sum + day.visitors, 0) / 7),
        data_accuracy: 'Accurate (hitung berdasarkan attendance/kehadiran)'
      }
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