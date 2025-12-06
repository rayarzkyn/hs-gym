// app/api/attendance/checkout/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';

import { broadcastToSSE } from '@/lib/sse-broadcast';

export async function POST(request) {
  try {
    const { attendanceId, userId } = await request.json();
    
    if (!attendanceId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Attendance ID dan User ID diperlukan' },
        { status: 400 }
      );
    }

    console.log(`🏃 Checkout request for attendance: ${attendanceId}, user: ${userId}`);

    // Get attendance data
    const attendanceRef = doc(db, 'attendance', attendanceId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (!attendanceDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Data presensi tidak ditemukan' },
        { status: 404 }
      );
    }

    const attendanceData = attendanceDoc.data();
    
    // Check if already checked out
    if (attendanceData.checkOutTime) {
      return NextResponse.json(
        { success: false, error: 'Sudah check-out sebelumnya' },
        { status: 400 }
      );
    }

    console.log(`📋 Attendance found, facility: ${attendanceData.facility || 'None'}`);

    // Calculate duration
    const checkInTime = attendanceData.checkInTime?.toDate();
    const checkOutTime = new Date();
    
    let duration = '';
    if (checkInTime) {
      const diffMs = checkOutTime - checkInTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        duration = `${diffHours} jam ${diffMinutes} menit`;
      } else {
        duration = `${diffMinutes} menit`;
      }
    }

    // Update attendance record
    await updateDoc(attendanceRef, {
      checkOutTime: serverTimestamp(),
      duration: duration,
      status: 'checked_out',
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Attendance ${attendanceId} marked as checked out`);

    // 🔥 PERBAIKAN: Update facility count jika ada facility
    if (attendanceData.facility) {
      try {
        // Cari facility berdasarkan nama
        const facilitiesRef = collection(db, 'facilities');
        const facilitiesSnapshot = await getDocs(facilitiesRef);
        
        let targetFacility = null;
        let facilityDocId = null;
        
        facilitiesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name === attendanceData.facility) {
            targetFacility = data;
            facilityDocId = doc.id;
          }
        });
        
        if (targetFacility && facilityDocId) {
          // Kurangi currentMembers (tidak boleh negatif)
          const currentMembers = Math.max(0, (targetFacility.currentMembers || 0) - 1);
          const capacity = targetFacility.capacity || 25;
          const usagePercentage = Math.round((currentMembers / capacity) * 100);
          
          const facilityRef = doc(db, 'facilities', facilityDocId);
          await updateDoc(facilityRef, {
            currentMembers: currentMembers,
            currentUsage: usagePercentage,
            updatedAt: serverTimestamp()
          });
          
          console.log(`✅ Facility ${attendanceData.facility} updated: -1 member (now: ${currentMembers}/${capacity})`);
          
          // 🔥 PERBAIKAN: Trigger SSE update menggunakan utils baru
          try {
            // Ambil semua facilities terbaru setelah update
            const updatedFacilitiesSnapshot = await getDocs(collection(db, 'facilities'));
            const facilities = updatedFacilitiesSnapshot.docs.map(doc => {
              const data = doc.data();
              const currentMembers = data.currentMembers || 0;
              const capacity = data.capacity || 25;
              const usagePercentage = Math.round((currentMembers / capacity) * 100);
              
              return {
                id: doc.id,
                name: data.name || 'Unknown Facility',
                status: data.status || 'available',
                capacity: capacity,
                currentMembers: currentMembers,
                currentUsage: usagePercentage,
                equipment: Array.isArray(data.equipment) ? data.equipment : [],
                peakHours: Array.isArray(data.peakHours) ? data.peakHours : ['07:00-09:00', '17:00-19:00'],
                lastMaintenance: data.lastMaintenance || '2024-01-01',
                nextMaintenance: data.nextMaintenance || '2024-02-01',
                maintenanceHistory: data.maintenanceHistory || [],
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
                updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
                usagePercentage: usagePercentage,
                timestamp: new Date().toISOString()
              };
            });
            
            // Broadcast ke semua connected SSE clients menggunakan utils
            const broadcastCount = broadcastToSSE({
              type: 'facility_update',
              data: facilities,
              timestamp: new Date().toISOString(),
              message: `Facility ${attendanceData.facility} updated after checkout`,
              source: 'checkout',
              attendanceId: attendanceId,
              facility: attendanceData.facility
            });
            
            console.log(`📡 SSE broadcasted to ${broadcastCount} clients after checkout`);
            
          } catch (sseError) {
            console.log('SSE broadcast error (non-critical):', sseError.message);
          }
        } else {
          console.log(`⚠️ Facility "${attendanceData.facility}" not found in database`);
        }
      } catch (facilityError) {
        console.log('Facility update error (non-critical):', facilityError.message);
      }
    }

    // Update member jika user adalah member
    try {
      // Cari member
      const membersQuery = query(
        collection(db, 'members'), 
        where('nomor_member', '==', userId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0];
        await updateDoc(memberDoc.ref, {
          lastCheckout: serverTimestamp(),
          current_facility: null, // Reset current facility
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Member ${userId} updated: checkout completed`);
      } else {
        // Coba cari di users collection
        const usersQuery = query(
          collection(db, 'users'), 
          where('username', '==', userId)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await updateDoc(userDoc.ref, {
            lastCheckout: serverTimestamp(),
            current_facility: null,
            updatedAt: serverTimestamp()
          });
          console.log(`✅ User ${userId} updated: checkout completed`);
        }
      }
    } catch (memberError) {
      console.log('Member update error (non-critical):', memberError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Check-out berhasil',
      data: {
        attendanceId,
        checkOutTime: checkOutTime.toISOString(),
        duration
      }
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gagal melakukan check-out',
        message: error.message 
      },
      { status: 500 }
    );
  }
}