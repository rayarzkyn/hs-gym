// app/api/member/transactions/route.js
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limitCount = parseInt(searchParams.get('limit') || '20');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID required' },
        { status: 400 }
      );
    }

    // Query transactions for this member
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('memberId', '==', memberId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const transactionsData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.() || data.date,
      };
    });

    // Jika tidak ada data di collection transactions, coba dari data member
    if (transactionsData.length === 0) {
      const memberRef = collection(db, 'members');
      const memberQuery = query(memberRef, where('nomor_member', '==', memberId));
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        transactionsData.push(...(memberData.riwayat_transaksi || []));
      }
    }

    return NextResponse.json({
      success: true,
      data: transactionsData
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}