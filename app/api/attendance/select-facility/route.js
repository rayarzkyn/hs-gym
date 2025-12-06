// app/api/attendance/select-facility/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  doc, 
  updateDoc, 
  getDoc,
  collection, 
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { attendanceId, facility, userId } = body;
    
    if (!attendanceId || !facility || !userId) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }
    
    console.log(`🎯 Selecting facility: ${facility} for user: ${userId}, attendance: ${attendanceId}`);
    
    // 1. Cek attendance
    const attendanceRef = doc(db, 'attendance', attendanceId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (!attendanceDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Data presensi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    const attendanceData = attendanceDoc.data();
    const previousFacility = attendanceData.facility; // 🔥 SIMPAN FACILITY SEBELUMNYA
    
    if (attendanceData.checkOutTime) {
      return NextResponse.json(
        { success: false, error: 'Sudah check-out, tidak bisa memilih fasilitas' },
        { status: 400 }
      );
    }
    
    // 🔥 PERBAIKAN 1: Kurangi count di facility lama (jika ada)
    if (previousFacility && previousFacility !== facility) {
      console.log(`🔄 User pindah dari ${previousFacility} ke ${facility}`);
      
      const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
      let previousFacilityFound = false;
      
      facilitiesSnapshot.forEach(async (doc) => {
        const data = doc.data();
        if (data.name === previousFacility) {
          previousFacilityFound = true;
          const currentMembers = Math.max(0, (data.currentMembers || 0) - 1);
          const capacity = data.capacity || 25;
          const usagePercentage = Math.round((currentMembers / capacity) * 100);
          
          await updateDoc(doc.ref, {
            currentMembers: currentMembers,
            currentUsage: usagePercentage,
            updatedAt: serverTimestamp()
          });
          
          console.log(`➖ Facility ${previousFacility} decreased: -1 member (now: ${currentMembers}/${capacity})`);
        }
      });
      
      if (!previousFacilityFound) {
        console.log(`⚠️ Previous facility ${previousFacility} not found`);
      }
    }
    
    // 2. Cari facility baru
    const facilitiesRef = collection(db, 'facilities');
    const facilitiesSnapshot = await getDocs(facilitiesRef);
    
    let foundFacility = null;
    let foundFacilityData = null;
    let foundFacilityId = null;
    
    facilitiesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name === facility) {
        foundFacility = doc;
        foundFacilityData = data;
        foundFacilityId = doc.id;
      }
    });
    
    if (!foundFacility) {
      console.log(`❌ Facility "${facility}" not found in database`);
      return NextResponse.json(
        { success: false, error: `Fasilitas "${facility}" tidak ditemukan` },
        { status: 404 }
      );
    }
    
    console.log(`✅ Facility found: ${facility} (ID: ${foundFacilityId})`);
    
    // 3. Hitung usage percentage baru
    const currentMembers = (foundFacilityData.currentMembers || 0) + 1;
    const capacity = foundFacilityData.capacity || 25;
    const usagePercentage = Math.round((currentMembers / capacity) * 100);
    
    // 4. Update attendance record
    await updateDoc(attendanceRef, {
      facility: facility,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Attendance ${attendanceId} updated with facility: ${facility}`);
    
    // 5. Update facility count (TAMBAH)
    const facilityRef = doc(db, 'facilities', foundFacilityId);
    await updateDoc(facilityRef, {
      currentMembers: currentMembers,
      currentUsage: usagePercentage,
      updatedAt: serverTimestamp()
    });
    
    console.log(`➕ Facility ${facility} updated: +1 member (now: ${currentMembers}/${capacity})`);
    
    // 6. Update member's current facility
    try {
      const membersQuery = query(
        collection(db, 'members'), 
        where('nomor_member', '==', userId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0];
        await updateDoc(memberDoc.ref, {
          current_facility: facility,
          last_checkin: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Member ${userId} updated with current facility: ${facility}`);
      } else {
        console.log(`⚠️ Member ${userId} not found in members collection`);
      }
    } catch (memberError) {
      console.log('Member update error (non-critical):', memberError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: `✅ Berhasil memilih ${facility}!`,
      data: {
        previousFacility: previousFacility,
        newFacility: facility,
        facilityId: foundFacilityId,
        attendanceId: attendanceId,
        newCount: currentMembers,
        capacity: capacity
      }
    });
    
  } catch (error) {
    console.error('❌ Error selecting facility:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memilih fasilitas: ' + error.message },
      { status: 500 }
    );
  }
}