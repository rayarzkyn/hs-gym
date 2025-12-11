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
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const preventAutoCheckin = searchParams.get('preventAutoCheckin');
    
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

    // **TAMBAHKAN FIELD JIKA BELUM ADA**
    if (memberData.active_visit === undefined) {
      await updateDoc(doc(db, 'non_members', memberId), {
        active_visit: false,
        manual_checkin: false,
        current_facility: null,
        current_facility_name: null,
        last_checkin: null,
        last_checkout: null,
        updated_at: Timestamp.now()
      });
      memberData.active_visit = false;
      memberData.manual_checkin = false;
      memberData.current_facility = null;
      memberData.current_facility_name = null;
    }

    // **RESET AUTO CHECKIN JIKA PERLU**
    if (preventAutoCheckin === 'true' && memberData.active_visit && !memberData.manual_checkin) {
      await updateDoc(doc(db, 'non_members', memberId), {
        active_visit: false,
        manual_checkin: false,
        current_facility: null,
        current_facility_name: null,
        updated_at: Timestamp.now()
      });
      memberData.active_visit = false;
      memberData.manual_checkin = false;
      console.log('✅ Reset auto checkin for:', username);
    }

    // **AMBIL DATA KUNJUNGAN GYM (HANYA yang login_type = 'non_member_daily')**
    let gymVisits = []; // Kunjungan gym (checkin/checkout harian)
    let facilityActivities = []; // Aktivitas fasilitas
    
    try {
      // Get ALL visits untuk user ini
      const visitsQuery = query(
        collection(db, 'non_member_visits'),
        where('username', '==', username),
        orderBy('checkin_time', 'desc')
      );
      
      const visitsSnapshot = await getDocs(visitsQuery);
      
      // Pisahkan berdasarkan login_type
      visitsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const formattedData = {
          id: doc.id,
          ...data,
          checkin_time: formatFirestoreDate(data.checkin_time),
          checkout_time: formatFirestoreDate(data.checkout_time),
          created_at: formatFirestoreDate(data.created_at),
          updated_at: formatFirestoreDate(data.updated_at)
        };

        // **KUNJUNGAN GYM**: login_type = 'non_member_daily'
        if (data.login_type === 'non_member_daily') {
          gymVisits.push(formattedData);
        } 
        // **AKTIVITAS FASILITAS**: login_type = 'facility_activity' atau ada facility_id
        else if (data.login_type === 'facility_activity' || data.facility_id) {
          facilityActivities.push({
            ...formattedData,
            activity_type: data.activity_type || 'enter',
            type: 'facility_activity'
          });
        }
      });
      
      console.log('📊 Found:', gymVisits.length, 'gym visits,', facilityActivities.length, 'facility activities');
      
    } catch (error) {
      console.log('Error fetching activities:', error.message);
    }

    // Tentukan status aktif di gym
    const isActiveInGym = gymVisits.some(visit => visit.status === 'active');
    
    // Jika database tidak punya active_visit, kita set berdasarkan data
    if (memberData.active_visit === undefined) {
      memberData.active_visit = isActiveInGym;
    }

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
      current_facility: memberData.current_facility || null,
      current_facility_name: memberData.current_facility_name || null,
      active_visit: memberData.active_visit || false,
      manual_checkin: memberData.manual_checkin || false,
      visits: gymVisits, // HANYA kunjungan gym
      facility_activities: facilityActivities, // aktivitas fasilitas
      total_visits: gymVisits.filter(v => v.status === 'completed').length // HANYA kunjungan selesai
    };

    console.log('✅ Non-member data loaded:', memberData.nama, 
      'Active:', memberData.active_visit, 
      'Total visits:', responseData.total_visits);

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
    const { username, action, facilityId, manual_checkin } = body;
    
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
    let memberData = memberDoc.data();
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

    // **TAMBAHKAN FIELD JIKA BELUM ADA**
    const initializeFields = {};
    if (memberData.active_visit === undefined) {
      initializeFields.active_visit = false;
      memberData.active_visit = false;
    }
    if (memberData.manual_checkin === undefined) {
      initializeFields.manual_checkin = false;
      memberData.manual_checkin = false;
    }
    if (memberData.current_facility === undefined) {
      initializeFields.current_facility = null;
      memberData.current_facility = null;
    }
    if (memberData.current_facility_name === undefined) {
      initializeFields.current_facility_name = null;
      memberData.current_facility_name = null;
    }
    
    if (Object.keys(initializeFields).length > 0) {
      await updateDoc(doc(db, 'non_members', memberId), {
        ...initializeFields,
        updated_at: Timestamp.now()
      });
      console.log('✅ Initialized missing fields for:', username);
    }

    switch (action) {
      case 'checkin':
        // Check if already has active gym visit
        const activeVisitQuery = query(
          collection(db, 'non_member_visits'),
          where('username', '==', username),
          where('status', '==', 'active'),
          where('login_type', '==', 'non_member_daily')
        );
        
        const activeVisitSnapshot = await getDocs(activeVisitQuery);
        
        if (!activeVisitSnapshot.empty) {
          return NextResponse.json({
            success: false,
            error: 'Anda sudah check-in sebelumnya. Silakan checkout terlebih dahulu.'
          }, { status: 400 });
        }

        // Record new DAILY VISIT - INI YANG +1 KUNJUNGAN
        const visitData = {
          username: username,
          daily_code: memberData.daily_code || '',
          nama: memberData.nama || '',
          location: 'Main Gym Area',
          login_type: 'non_member_daily', // TANDAI SEBAGAI KUNJUNGAN GYM
          status: 'active',
          manual_checkin: manual_checkin || false,
          checkin_time: Timestamp.now(),
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'non_member_visits'), visitData);

        // Update non_members
        await updateDoc(doc(db, 'non_members', memberId), {
          active_visit: true,
          manual_checkin: manual_checkin || false,
          last_checkin: Timestamp.now(),
          updated_at: Timestamp.now()
        });

        console.log('✅ Daily check-in recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-in harian berhasil! Selamat berolahraga 🏋️‍♂️',
          data: {
            visit_id: docRef.id,
            checkin_time: now.toISOString(),
            is_visit: true, // INI ADALAH KUNJUNGAN (+1)
            total_visits_increment: 1
          }
        });

      case 'checkout':
        // Find active daily visit
        const dailyVisitQuery = query(
          collection(db, 'non_member_visits'),
          where('username', '==', username),
          where('status', '==', 'active'),
          where('login_type', '==', 'non_member_daily')
        );
        
        const dailyVisitSnapshot = await getDocs(dailyVisitQuery);
        
        if (dailyVisitSnapshot.empty) {
          return NextResponse.json({
            success: false,
            error: 'Tidak ada check-in harian aktif ditemukan'
          }, { status: 400 });
        }

        const dailyVisitDoc = dailyVisitSnapshot.docs[0];
        const dailyVisitData = dailyVisitDoc.data();
        const checkinTime = formatFirestoreDate(dailyVisitData.checkin_time);
        const checkoutTime = new Date();
        const durationMs = checkoutTime.getTime() - checkinTime.getTime();
        
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

        // Update daily visit record
        await updateDoc(doc(db, 'non_member_visits', dailyVisitDoc.id), {
          status: 'completed',
          checkout_time: Timestamp.fromDate(checkoutTime),
          duration: durationText,
          updated_at: Timestamp.now()
        });

        // **Keluar dari fasilitas jika sedang di fasilitas**
        if (memberData.current_facility) {
          await handleLeaveFacility(username, memberData.current_facility, memberData.nama, false);
        }

        // Update non_members untuk reset status
        await updateDoc(doc(db, 'non_members', memberId), {
          active_visit: false,
          manual_checkin: false,
          current_facility: null,
          current_facility_name: null,
          last_checkout: Timestamp.now(),
          updated_at: Timestamp.now()
        });

        console.log('✅ Daily check-out recorded for:', username);

        return NextResponse.json({
          success: true,
          message: 'Check-out harian berhasil! Terima kasih telah berkunjung 👋',
          data: {
            visit_id: dailyVisitDoc.id,
            checkin_time: checkinTime.toISOString(),
            checkout_time: checkoutTime.toISOString(),
            duration: durationText,
            is_visit: true // INI ADALAH KUNJUNGAN YANG SELESAI
          }
        });

      case 'select_facility':
        // **MEMILIH FASILITAS - TIDAK MENAMBAH KUNJUNGAN**
        if (!facilityId) {
          return NextResponse.json({
            success: false,
            error: 'Facility ID diperlukan'
          }, { status: 400 });
        }

        // Cek apakah user sudah checkin harian
        if (!memberData.active_visit) {
          // Cek juga di visits
          const activeGymVisit = await getDocs(query(
            collection(db, 'non_member_visits'),
            where('username', '==', username),
            where('status', '==', 'active'),
            where('login_type', '==', 'non_member_daily')
          ));
          
          if (activeGymVisit.empty) {
            return NextResponse.json({
              success: false,
              error: 'Silakan check-in harian terlebih dahulu'
            }, { status: 400 });
          }
          
          // Update active_visit di non_members
          await updateDoc(doc(db, 'non_members', memberId), {
            active_visit: true,
            updated_at: Timestamp.now()
          });
          memberData.active_visit = true;
        }

        // Cek apakah fasilitas ada
        const newFacilityRef = doc(db, 'facilities', facilityId);
        const newFacilityDoc = await getDoc(newFacilityRef);
        
        if (!newFacilityDoc.exists()) {
          return NextResponse.json({
            success: false,
            error: 'Fasilitas tidak ditemukan'
          }, { status: 400 });
        }

        const newFacilityData = newFacilityDoc.data();
        
        // Cek status fasilitas
        if (newFacilityData.status !== 'available') {
          return NextResponse.json({
            success: false,
            error: `Fasilitas sedang ${newFacilityData.status}`
          }, { status: 400 });
        }

        // Cek kapasitas
        let currentMembers = newFacilityData.currentMembers || 0;
        const capacity = newFacilityData.capacity || 1;
        const usagePercentage = (currentMembers / capacity) * 100;
        
        if (usagePercentage >= 90) {
          return NextResponse.json({
            success: false,
            error: 'Fasilitas sudah penuh!'
          }, { status: 400 });
        }

        const currentFacilityId = memberData.current_facility;
        const currentFacilityName = memberData.current_facility_name;
        
        // **PERBAIKAN: JIKA SEDANG DI FASILITAS LAIN, KELUAR DULU**
        if (currentFacilityId && currentFacilityId !== facilityId) {
          console.log('🔄 Keluar dari fasilitas lama:', currentFacilityId);
          await handleLeaveFacility(username, currentFacilityId, memberData.nama, true);
        }
        
        // **PERBAIKAN: JIKA SUDAH DI FASILITAS INI, BERHENTI**
        if (currentFacilityId === facilityId) {
          return NextResponse.json({
            success: false,
            error: 'Anda sudah berada di fasilitas ini'
          }, { status: 400 });
        }

        // **PERBAIKAN: MASUK KE FASILITAS BARU - UPDATE DENGAN BENAR**
        // Cek apakah user sudah ada di fasilitas ini
        const isAlreadyInFacility = newFacilityData.activeMembers?.some(
          (member) => member.id === username
        );

        let updatedCurrentMembers = currentMembers;
        const newMemberData = {
          id: username,
          name: memberData.nama,
          checkinTime: Timestamp.now(),
          type: 'non-member-daily',
          dailyCode: memberData.daily_code
        };

        if (!isAlreadyInFacility) {
          updatedCurrentMembers = currentMembers + 1;
          
          // **PERBAIKAN: UPDATE FACILITY DENGAN DATA YANG BENAR**
          const facilityUpdate = {
            currentMembers: updatedCurrentMembers,
            currentUsage: Math.round((updatedCurrentMembers / capacity) * 100),
            updatedAt: Timestamp.now()
          };
          
          // Tambah user ke activeMembers dengan format yang konsisten
          if (newFacilityData.activeMembers && Array.isArray(newFacilityData.activeMembers)) {
            facilityUpdate.activeMembers = arrayUnion(newMemberData);
          } else {
            facilityUpdate.activeMembers = [newMemberData];
          }
          
          console.log('📈 Memasuki fasilitas baru:', {
            username: username,
            facility: newFacilityData.name,
            currentMembers: updatedCurrentMembers,
            capacity: capacity,
            percentage: Math.round((updatedCurrentMembers / capacity) * 100) + '%'
          });
          
          await updateDoc(newFacilityRef, facilityUpdate);
        }

        // **PERBAIKAN: UPDATE NON_MEMBERS DENGAN FACILITY BARU**
        await updateDoc(doc(db, 'non_members', memberId), {
          current_facility: facilityId,
          current_facility_name: newFacilityData.name,
          updated_at: Timestamp.now()
        });

        // **PERBAIKAN: RECORD FACILITY ACTIVITY (BUKAN VISIT/KUNJUNGAN)**
        const facilityActionType = currentFacilityId ? 'switch' : 'enter';
        
         const facilityActivityData = {
    username: username,
    daily_code: memberData.daily_code,
    nama: memberData.nama,
    facility_id: facilityId,
    facility_name: newFacilityData.name,
    activity_type: facilityActionType,
    login_type: 'facility_activity', // ✅ HARUS 'facility_activity' BUKAN 'non_member_daily'
    previous_facility: currentFacilityId,
    previous_facility_name: currentFacilityName,
    status: 'active',
    checkin_time: Timestamp.now(),
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    member_type: 'non-member-daily',
    is_visit: false, // ✅ Tandai BUKAN visit/kunjungan
    is_facility_activity: true // ✅ Tandai sebagai aktivitas fasilitas
  };
        
        const facilityActivityRef = await addDoc(collection(db, 'non_member_visits'), facilityActivityData);

        console.log('🏋️‍♂️ Creating FACILITY ACTIVITY (not visit):', {
    username: username,
    facility: newFacilityData.name,
    login_type: 'facility_activity',
    is_visit: false,
    note: 'This should NOT appear in attendance/daily checkins'
  });

        return NextResponse.json({
          success: true,
          message: `Berhasil ${currentFacilityId ? 'ganti' : 'masuk'} ke ${newFacilityData.name}!`,
          data: {
            facility_id: facilityId,
            facility_name: newFacilityData.name,
            current_members: updatedCurrentMembers,
            capacity: capacity,
            usage_percentage: Math.round((updatedCurrentMembers / capacity) * 100),
            action_type: facilityActionType,
            is_visit: false, // TEGASKAN BUKAN KUNJUNGAN
            total_visits_increment: 0 // TIDAK MENAMBAH KUNJUNGAN
          }
        });

      case 'leave_facility':
        // **KELUAR DARI FASILITAS (TANPA CHECKOUT HARIAN)**
        if (!memberData.current_facility) {
          return NextResponse.json({
            success: false,
            error: 'Anda tidak sedang menggunakan fasilitas'
          }, { status: 400 });
        }

        const leaveFacilityId = memberData.current_facility;
        
        // **PERBAIKAN: Keluar dari fasilitas dengan benar**
        await handleLeaveFacility(username, leaveFacilityId, memberData.nama, false);
        
        // Update non_members - HAPUS current_facility TAPI TETAP active_visit
        await updateDoc(doc(db, 'non_members', memberId), {
          current_facility: null,
          current_facility_name: null,
          updated_at: Timestamp.now()
        });

        console.log('✅ Left facility:', leaveFacilityId, 'for:', username);

        return NextResponse.json({
          success: true,
          message: 'Berhasil keluar dari fasilitas',
          data: {
            facility_id: leaveFacilityId,
            is_visit: false, // BUKAN KUNJUNGAN
            total_visits_increment: 0 // TIDAK MENGURANGI KUNJUNGAN
          }
        });

      case 'reset_auto_checkin':
        // Reset auto checkin
        await updateDoc(doc(db, 'non_members', memberId), {
          active_visit: false,
          manual_checkin: false,
          current_facility: null,
          current_facility_name: null,
          updated_at: Timestamp.now()
        });

        console.log('✅ Reset auto checkin for:', username);

        return NextResponse.json({
          success: true,
          message: 'Auto checkin berhasil direset'
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

// Helper function untuk keluar dari fasilitas
async function handleLeaveFacility(username, facilityId, memberName, isSwitching = false) {
  console.log('🚪 Keluar dari fasilitas:', {
    username: username,
    facilityId: facilityId,
    memberName: memberName,
    isSwitching: isSwitching
  });
  
  const facilityRef = doc(db, 'facilities', facilityId);
  const facilityDoc = await getDoc(facilityRef);
  
  if (facilityDoc.exists()) {
    const facilityData = facilityDoc.data();
    let currentMembers = facilityData.currentMembers || 0;
    const capacity = facilityData.capacity || 1;
    
    // **PERBAIKAN: Pastikan user memang ada di fasilitas ini**
    const userInFacility = facilityData.activeMembers?.some(
      (member) => member.id === username
    );
    
    if (userInFacility) {
      // Kurangi jumlah member dengan benar
      currentMembers = Math.max(0, currentMembers - 1);
      
      // **PERBAIKAN: Hapus user dari activeMembers**
      const facilityUpdate = {
        currentMembers: currentMembers,
        currentUsage: Math.round((currentMembers / capacity) * 100),
        updatedAt: Timestamp.now()
      };
      
      // **PERBAIKAN: Cari user di activeMembers**
      if (facilityData.activeMembers && Array.isArray(facilityData.activeMembers)) {
        // Temukan user yang sesuai
        const userToRemove = facilityData.activeMembers.find(
          (member) => member.id === username
        );
        
        if (userToRemove) {
          // **PERBAIKAN: Gunakan arrayRemove dengan objek yang sama persis**
          await updateDoc(facilityRef, {
            currentMembers: currentMembers,
            currentUsage: Math.round((currentMembers / capacity) * 100),
            activeMembers: arrayRemove(userToRemove),
            updatedAt: Timestamp.now()
          });
          
          console.log('📉 Berhasil keluar dari fasilitas:', {
            username: username,
            facility: facilityData.name,
            currentMembers: currentMembers,
            capacity: capacity,
            percentage: Math.round((currentMembers / capacity) * 100) + '%'
          });
        }
      } else {
        // Jika tidak ada activeMembers array, buat array kosong
        await updateDoc(facilityRef, {
          currentMembers: currentMembers,
          currentUsage: Math.round((currentMembers / capacity) * 100),
          activeMembers: [],
          updatedAt: Timestamp.now()
        });
      }
    } else {
      console.log('⚠️ User tidak ditemukan di fasilitas:', username, facilityId);
      
      // **PERBAIKAN: Tetap update currentMembers jika perlu**
      if (currentMembers > 0) {
        currentMembers = Math.max(0, currentMembers - 1);
        await updateDoc(facilityRef, {
          currentMembers: currentMembers,
          currentUsage: Math.round((currentMembers / capacity) * 100),
          updatedAt: Timestamp.now()
        });
      }
    }

    // **PERBAIKAN: Update facility activity record dengan kondisi yang tepat**
    const facilityActivityQuery = query(
      collection(db, 'non_member_visits'),
      where('username', '==', username),
      where('facility_id', '==', facilityId),
      where('status', '==', 'active'),
      where('login_type', '==', 'facility_activity')
    );
    
    const facilityActivitySnapshot = await getDocs(facilityActivityQuery);
    
    if (!facilityActivitySnapshot.empty) {
      const facilityActivity = facilityActivitySnapshot.docs[0];
      const facilityActivityData = facilityActivity.data();
      const checkinTime = facilityActivityData.checkin_time?.toDate?.() || new Date(facilityActivityData.checkin_time);
      const checkoutTime = new Date();
      const durationMs = checkoutTime.getTime() - checkinTime.getTime();
      
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

      await updateDoc(doc(db, 'non_member_visits', facilityActivity.id), {
        status: 'completed',
        checkout_time: Timestamp.fromDate(checkoutTime),
        duration: durationText,
        action_type: isSwitching ? 'switch_out' : 'leave',
        updated_at: Timestamp.now()
      });
      
      console.log('📝 Facility activity completed:', {
        username: username,
        facility: facilityData.name,
        duration: durationText,
        action: isSwitching ? 'switch_out' : 'leave'
      });
    }
  } else {
    console.error('❌ Fasilitas tidak ditemukan:', facilityId);
  }
}