// app/api/attendance/checkin/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  increment, 
  doc,
  getDocs 
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userName, type = 'member', facility } = body;
    
    if (!userId || !userName) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }
    
    console.log(`🎫 Processing checkin for: ${userName} (${userId})`);
    
    // Create attendance record
    const attendanceData = {
      userId: userId,
      userName: userName,
      type: type,
      checkInTime: new Date(),
      date: new Date().toISOString().split('T')[0],
      status: 'checked_in',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Jika ada facility yang dipilih langsung
    if (facility) {
      attendanceData.facility = facility;
      
      // Update facility count
      const facilitiesRef = collection(db, 'facilities');
      const facilitiesSnapshot = await getDocs(facilitiesRef);
      
      let facilityDoc = null;
      facilitiesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name === facility) {
          facilityDoc = doc;
        }
      });
      
      if (facilityDoc) {
        const facilityRef = doc(db, 'facilities', facilityDoc.id);
        await updateDoc(facilityRef, {
          currentMembers: increment(1),
          currentUsage: increment(1),
          updatedAt: new Date()
        });
        
        console.log(`✅ Facility ${facility} updated: +1 member`);
      }
    }
    
    const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
    
    console.log(`✅ Checkin successful, ID: ${docRef.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Check-in berhasil!',
      data: {
        id: docRef.id,
        ...attendanceData
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking in:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal check-in: ' + error.message },
      { status: 500 }
    );
  }
}