import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const { memberId } = await request.json();
    
    console.log('🔄 Processing checkin for member:', memberId);

    if (!memberId) {
      return NextResponse.json({
        success: false,
        error: 'Member ID diperlukan'
      }, { status: 400 });
    }

    // Cari member di collections
    let memberDocRef = doc(db, 'members', memberId);
    let memberDoc = await getDoc(memberDocRef);

    if (!memberDoc.exists()) {
      memberDocRef = doc(db, 'users', memberId);
      memberDoc = await getDoc(memberDocRef);
    }

    if (!memberDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Member tidak ditemukan di database'
      }, { status: 404 });
    }

    const memberData = memberDoc.data();

    // Create new visit record
    const visitData = {
      memberId: memberId,
      memberName: memberData.nama || memberData.fullName || memberId,
      checkinTime: serverTimestamp(),
      location: 'Main Gym Area',
      status: 'completed',
      duration: '2 jam',
      createdAt: serverTimestamp()
    };

    const newVisitRef = await addDoc(collection(db, 'visits'), visitData);

    // Update member's visit count
    const totalVisits = (memberData.totalVisits || 0) + 1;
    const lastCheckin = new Date().toISOString();
    
    await updateDoc(memberDocRef, {
      lastCheckin: lastCheckin,
      totalVisits: totalVisits,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Check-in recorded for:', memberId, 'Visit ID:', newVisitRef.id);

    return NextResponse.json({
      success: true,
      message: 'Check-in berhasil! Selamat berolahraga 🏋️‍♂️',
      data: {
        visitId: newVisitRef.id,
        checkinTime: lastCheckin,
        location: visitData.location,
        totalVisits: totalVisits
      }
    });

  } catch (error) {
    console.error('❌ Error in checkin API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat check-in',
        message: error.message 
      },
      { status: 500 }
    );
  }
}