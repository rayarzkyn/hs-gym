import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('🔢 Generating next member number from Firebase...');

    // Query members collection untuk mendapatkan member terakhir
    const membersQuery = query(
      collection(db, 'members'),
      orderBy('nomor_member', 'desc'),
      limit(1)
    );

    const membersSnapshot = await getDocs(membersQuery);
    
    let nextNumber = 1;
    
    if (!membersSnapshot.empty) {
      const lastMember = membersSnapshot.docs[0].data();
      const lastMemberNumber = lastMember.nomor_member;
      
      // Extract number from format "M001", "M002", etc.
      if (lastMemberNumber && lastMemberNumber.startsWith('M')) {
        const lastNumber = parseInt(lastMemberNumber.substring(1));
        nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
      }
    }

    const nextMemberNumber = `M${nextNumber.toString().padStart(3, '0')}`;
    
    console.log('✅ Next member number:', nextMemberNumber);

    return NextResponse.json({
      success: true,
      nextMemberNumber: nextMemberNumber
    });

  } catch (error) {
    console.error('❌ Error generating member number:', error);
    
    // Fallback: generate based on timestamp
    const fallbackNumber = `M${Date.now().toString().slice(-3)}`;
    
    return NextResponse.json({
      success: true,
      nextMemberNumber: fallbackNumber
    });
  }
}