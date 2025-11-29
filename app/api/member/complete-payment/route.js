import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { user_id, transaction_id, bukti_pembayaran } = await request.json();

    console.log('💳 Completing payment for user:', user_id);

    // 1. Update transaction status in Firestore
    const transactionDocRef = doc(db, 'transactions', transaction_id);
    const transactionDoc = await getDoc(transactionDocRef);

    if (transactionDoc.exists()) {
      await updateDoc(transactionDocRef, {
        status: 'completed',
        bukti_pembayaran: bukti_pembayaran,
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Update member status and activation dates
    const memberDocRef = doc(db, 'members', user_id);
    const memberDoc = await getDoc(memberDocRef);

    if (memberDoc.exists()) {
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await updateDoc(memberDocRef, {
        status: 'active',
        tanggal_daftar: now.toISOString(),
        masa_aktif: oneMonthLater.toISOString(),
        updatedAt: now.toISOString()
      });
    }

    console.log('✅ Payment completed successfully for user:', user_id);

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil! Akun Anda sekarang aktif.'
    });

  } catch (error) {
    console.error('❌ Complete payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat memproses pembayaran' },
      { status: 500 }
    );
  }
}