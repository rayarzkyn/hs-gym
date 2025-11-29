import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-client';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({
        success: false,
        error: 'Username diperlukan'
      }, { status: 400 });
    }

    console.log('🔍 Fetching data for non-member:', username);

    // Cari non-member berdasarkan username
    const nonMemberQuery = query(
      collection(db, 'non_members'),
      where('username', '==', username)
    );
    
    const querySnapshot = await getDocs(nonMemberQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Data non-member tidak ditemukan'
      }, { status: 400 });
    }

    const memberDoc = querySnapshot.docs[0];
    const memberData = memberDoc.data();
    
    // Check expiration
    const now = new Date();
    let expiredAt;
    if (memberData.expired_at?.toDate) {
      expiredAt = memberData.expired_at.toDate();
    } else if (memberData.expired_at instanceof Date) {
      expiredAt = memberData.expired_at;
    } else {
      expiredAt = new Date(memberData.expired_at);
    }
    
    if (now > expiredAt) {
      // Update status to expired
      await updateDoc(doc(db, 'non_members', memberDoc.id), {
        status: 'expired',
        updated_at: new Date()
      });
      
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
      }, { status: 400 });
    }

    if (memberData.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Akun non-member tidak aktif'
      }, { status: 400 });
    }

    // Get visit history for this member
    let visits = [];
    try {
      const visitsQuery = query(
        collection(db, 'non_member_visits'),
        where('username', '==', username),
        orderBy('checkin_time', 'desc')
      );
      
      const visitsSnapshot = await getDocs(visitsQuery);
      visits = visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkin_time: doc.data().checkin_time?.toDate?.() || doc.data().checkin_time
      }));
    } catch (error) {
      console.log('No visits found:', error.message);
    }

    // Prepare response data
    const responseData = {
      daily_code: memberData.daily_code,
      username: memberData.username,
      nama: memberData.nama,
      email: memberData.email,
      telepon: memberData.telepon,
      harga: memberData.harga,
      status: memberData.status,
      tanggal_daftar: memberData.tanggal_daftar,
      expired_at: memberData.expired_at,
      created_at: memberData.created_at,
      visits: visits,
      total_visits: visits.length,
      active_visit: visits.find(v => v.status === 'active') || null
    };

    console.log('✅ Non-member data loaded:', memberData.nama);

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error in non-member data API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat mengambil data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { username, action } = await request.json();
    
    if (!username) {
      return NextResponse.json({
        success: false,
        error: 'Username diperlukan'
      }, { status: 400 });
    }

    console.log('🔄 Non-member action:', action, 'for:', username);

    // Check validity first - cari data member
    const nonMemberQuery = query(
      collection(db, 'non_members'),
      where('username', '==', username)
    );
    
    const querySnapshot = await getDocs(nonMemberQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Data non-member tidak ditemukan'
      }, { status: 400 });
    }

    const memberDoc = querySnapshot.docs[0];
    const memberData = memberDoc.data();

    // Check expiration
    const now = new Date();
    let expiredAt;
    if (memberData.expired_at?.toDate) {
      expiredAt = memberData.expired_at.toDate();
    } else if (memberData.expired_at instanceof Date) {
      expiredAt = memberData.expired_at;
    } else {
      expiredAt = new Date(memberData.expired_at);
    }
    
    if (now > expiredAt) {
      await updateDoc(doc(db, 'non_members', memberDoc.id), {
        status: 'expired',
        updated_at: new Date()
      });
      
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
      }, { status: 400 });
    }

    if (memberData.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Akun non-member tidak aktif'
      }, { status: 400 });
    }

    switch (action) {
      case 'checkin':
        // Check if already has active visit
        const activeVisitQuery = query(
          collection(db, 'non_member_visits'),
          where('username', '==', username),
          where('status', '==', 'active')
        );
        
        const activeVisitSnapshot = await getDocs(activeVisitQuery);
        
        if (!activeVisitSnapshot.empty) {
          return NextResponse.json({
            success: false,
            error: 'Anda sudah check-in sebelumnya. Silakan checkout terlebih dahulu.'
          }, { status: 400 });
        }

        // Record new visit
        const visitDoc = {
          username: username,
          daily_code: memberData.daily_code,
          nama: memberData.nama,
          location: 'Main Gym Area',
          status: 'active',
          checkin_time: new Date(),
          created_at: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'non_member_visits'), visitDoc);

        console.log('✅ Check-in recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-in berhasil! Selamat berolahraga 🏋️‍♂️',
          data: {
            visit_id: docRef.id,
            checkin_time: new Date().toISOString(),
            location: 'Main Gym Area'
          }
        });

      case 'checkout':
        // Find active visit and update to completed
        const activeVisitQueryCheckout = query(
          collection(db, 'non_member_visits'),
          where('username', '==', username),
          where('status', '==', 'active')
        );
        
        const activeVisitSnapshotCheckout = await getDocs(activeVisitQueryCheckout);
        
        if (activeVisitSnapshotCheckout.empty) {
          return NextResponse.json({
            success: false,
            error: 'Tidak ada check-in aktif ditemukan'
          }, { status: 400 });
        }

        const activeVisit = activeVisitSnapshotCheckout.docs[0];
        const checkinTime = activeVisit.data().checkin_time?.toDate?.() || activeVisit.data().checkin_time;
        const checkoutTime = new Date();
        const durationMs = checkoutTime - checkinTime;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);

        await updateDoc(doc(db, 'non_member_visits', activeVisit.id), {
          status: 'completed',
          checkout_time: checkoutTime,
          duration: `${durationHours} jam`,
          updated_at: new Date()
        });

        console.log('✅ Check-out recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-out berhasil! Terima kasih telah berkunjung 👋',
          data: {
            visit_id: activeVisit.id,
            checkin_time: checkinTime,
            checkout_time: checkoutTime,
            duration: `${durationHours} jam`
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Action tidak dikenali'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in non-member POST API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan server'
    }, { status: 500 });
  }
}