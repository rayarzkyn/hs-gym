import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const { memberId, memberName, location, facility, duration = '2 jam' } = await request.json();
    
    if (!memberId || !memberName) {
      return NextResponse.json(
        { success: false, error: 'Member ID dan nama diperlukan' },
        { status: 400 }
      );
    }

    const visitData = {
      memberId,
      memberName,
      location: location || 'Main Gym Area',
      facility: facility || location || 'Main Gym Area',
      duration,
      checkinTime: serverTimestamp(),
      status: 'completed',
      createdAt: serverTimestamp()
    };

    const visitRef = await addDoc(collection(db, 'visits'), visitData);
    
    return NextResponse.json({
      success: true,
      message: 'Visit recorded successfully',
      data: {
        visitId: visitRef.id,
        ...visitData
      }
    });

  } catch (error) {
    console.error('Visit record error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal merekam visit' },
      { status: 500 }
    );
  }
}