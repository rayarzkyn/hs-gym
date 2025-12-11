import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID diperlukan' },
        { status: 400 }
      );
    }

    console.log('💰 Checking payment status for member:', memberId);

    // 1. Check member status
    const memberDocRef = doc(db, 'members', memberId);
    const memberDoc = await getDoc(memberDocRef);

    let memberStatus = 'unknown';
    let membershipPlan = '';
    let membershipPrice = 0;

    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      memberStatus = memberData.status || 'unknown';
      membershipPlan = memberData.membership_plan || '';
      membershipPrice = memberData.membership_price || 0;
    }

    // 2. Check latest transaction
    let paymentStatus = 'unknown';
    let paymentMethod = null;
    let paymentDate = null;
    let amount = 0;

    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('memberId', '==', memberId),
        orderBy('tanggal', 'desc'),
        limit(1)
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);

      if (!transactionsSnapshot.empty) {
        const latestTransaction = transactionsSnapshot.docs[0].data();
        paymentStatus = latestTransaction.status || 'unknown';
        paymentMethod = latestTransaction.metode_pembayaran || null;
        paymentDate = latestTransaction.tanggal || null;
        amount = latestTransaction.jumlah || 0;
      }
    } catch (error) {
      console.log('No transactions found for member:', memberId);
    }

    // Determine final status (prioritize transaction status)
    const finalStatus = paymentStatus !== 'unknown' ? paymentStatus : memberStatus;

    console.log('🎯 Final payment status:', finalStatus);

    return NextResponse.json({
      success: true,
      payment_status: finalStatus,
      member_status: memberStatus,
      amount: amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      membership_plan: membershipPlan,
      membership_price: membershipPrice
    });

  } catch (error) {
    console.error('❌ Payment status error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}