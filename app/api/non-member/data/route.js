import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-client';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

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
    const memberId = memberDoc.id;
    
    // Format tanggal dengan benar
    const formatFirestoreDate = (date) => {
      if (!date) return null;
      if (date.toDate) {
        return date.toDate().toISOString();
      } else if (date instanceof Date) {
        return date.toISOString();
      } else if (typeof date === 'string') {
        return new Date(date).toISOString();
      }
      return null;
    };

    // Check expiration
    const now = new Date();
    let expiredAt;
    
    if (memberData.expired_at) {
      if (memberData.expired_at.toDate) {
        expiredAt = memberData.expired_at.toDate();
      } else if (memberData.expired_at instanceof Date) {
        expiredAt = memberData.expired_at;
      } else if (typeof memberData.expired_at === 'string') {
        expiredAt = new Date(memberData.expired_at);
      } else {
        expiredAt = new Date(); // fallback
      }
    } else {
      // Jika tidak ada expired_at, buat default 24 jam dari now
      expiredAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      // Simpan ke database
      await updateDoc(doc(db, 'non_members', memberId), {
        expired_at: Timestamp.fromDate(expiredAt)
      });
    }
    
    if (now > expiredAt && memberData.status !== 'expired') {
      // Update status to expired
      await updateDoc(doc(db, 'non_members', memberId), {
        status: 'expired',
        updated_at: Timestamp.now()
      });
      
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
      }, { status: 400 });
    }

    if (memberData.status === 'expired') {
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
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
      visits = visitsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkin_time: formatFirestoreDate(data.checkin_time),
          checkout_time: formatFirestoreDate(data.checkout_time),
          created_at: formatFirestoreDate(data.created_at)
        };
      });
    } catch (error) {
      console.log('No visits found or error:', error.message);
    }

    // Get current facility from non_members document
    const currentFacility = memberData.current_facility || null;

    // Find active visit
    const activeVisit = visits.find(v => v.status === 'active') || null;

    // Prepare response data
    const responseData = {
      id: memberId,
      daily_code: memberData.daily_code || '',
      username: memberData.username || '',
      nama: memberData.nama || '',
      email: memberData.email || '',
      telepon: memberData.telepon || '',
      harga: memberData.harga || 0,
      status: memberData.status || 'active',
      tanggal_daftar: formatFirestoreDate(memberData.tanggal_daftar),
      expired_at: formatFirestoreDate(expiredAt),
      created_at: formatFirestoreDate(memberData.created_at),
      current_facility: currentFacility,
      visits: visits,
      total_visits: visits.length,
      active_visit: activeVisit
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
    const body = await request.json();
    const { username, action, facilityId } = body;
    
    if (!username || !action) {
      return NextResponse.json({
        success: false,
        error: 'Username dan action diperlukan'
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
    const memberId = memberDoc.id;

    // Format tanggal
    const formatFirestoreDate = (date) => {
      if (!date) return null;
      if (date.toDate) {
        return date.toDate();
      } else if (date instanceof Date) {
        return date;
      } else if (typeof date === 'string') {
        return new Date(date);
      }
      return new Date();
    };

    // Check expiration
    const now = new Date();
    let expiredAt = formatFirestoreDate(memberData.expired_at);
    
    // Jika tidak ada expired_at, buat default 24 jam dari pembuatan
    if (!expiredAt) {
      const createdAt = formatFirestoreDate(memberData.created_at) || now;
      expiredAt = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));
      await updateDoc(doc(db, 'non_members', memberId), {
        expired_at: Timestamp.fromDate(expiredAt)
      });
    }
    
    if (now > expiredAt) {
      await updateDoc(doc(db, 'non_members', memberId), {
        status: 'expired',
        updated_at: Timestamp.now()
      });
      
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
      }, { status: 400 });
    }

    if (memberData.status === 'expired') {
      return NextResponse.json({
        success: false,
        error: 'Daily pass sudah kadaluarsa'
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

        // Record new visit (DAILY checkin, bukan facility checkin)
        const visitData = {
          username: username,
          daily_code: memberData.daily_code || '',
          nama: memberData.nama || '',
          location: 'Main Gym Area',
          type: 'daily_checkin',
          status: 'active',
          checkin_time: Timestamp.now(),
          created_at: Timestamp.now()
        };
        
        // Jika ada facilityId, berarti checkin ke fasilitas tertentu
        if (facilityId) {
          // Cek apakah fasilitas ada
          const facilityDoc = await getDoc(doc(db, 'facilities', facilityId));
          if (facilityDoc.exists()) {
            visitData.facility_id = facilityId;
            visitData.facility_name = facilityDoc.data().name;
            visitData.type = 'facility_checkin';
          }
        }
        
        const docRef = await addDoc(collection(db, 'non_member_visits'), visitData);

        // Update non_members untuk current_facility jika checkin ke fasilitas
        if (facilityId) {
          await updateDoc(doc(db, 'non_members', memberId), {
            current_facility: facilityId,
            last_checkin: Timestamp.now(),
            updated_at: Timestamp.now()
          });
        } else {
          await updateDoc(doc(db, 'non_members', memberId), {
            last_checkin: Timestamp.now(),
            updated_at: Timestamp.now()
          });
        }

        console.log('✅ Check-in recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-in berhasil! Selamat berolahraga 🏋️‍♂️',
          data: {
            visit_id: docRef.id,
            checkin_time: now.toISOString(),
            location: 'Main Gym Area',
            facility_id: facilityId || null
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

        const activeVisitDoc = activeVisitSnapshotCheckout.docs[0];
        const activeVisitData = activeVisitDoc.data();
        const checkinTime = formatFirestoreDate(activeVisitData.checkin_time);
        const checkoutTime = new Date();
        const durationMs = checkoutTime.getTime() - checkinTime.getTime();
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);
        const durationMinutes = Math.floor(durationMs / (1000 * 60));

        // Update visit record
        await updateDoc(doc(db, 'non_member_visits', activeVisitDoc.id), {
          status: 'completed',
          checkout_time: Timestamp.fromDate(checkoutTime),
          duration: durationMinutes < 60 ? `${durationMinutes} menit` : `${durationHours} jam`,
          updated_at: Timestamp.now()
        });

        // Update non_members untuk current_facility jika ada
        if (memberData.current_facility) {
          await updateDoc(doc(db, 'non_members', memberId), {
            current_facility: null,
            updated_at: Timestamp.now()
          });
        }

        console.log('✅ Check-out recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-out berhasil! Terima kasih telah berkunjung 👋',
          data: {
            visit_id: activeVisitDoc.id,
            checkin_time: checkinTime.toISOString(),
            checkout_time: checkoutTime.toISOString(),
            duration: durationMinutes < 60 ? `${durationMinutes} menit` : `${durationHours} jam`
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