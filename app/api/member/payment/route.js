import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { member_id, payment_method, amount, bukti_pembayaran, membership_plan, transaction_id } = await request.json();

    console.log('💳 Processing payment for member:', member_id);
    console.log('📦 Payment data:', { member_id, payment_method, amount, membership_plan });

    // 1. Simpan data pembayaran ke collection 'transactions'
    const transactionData = {
      member_id: member_id,
       memberId: member_id,
      tanggal: serverTimestamp(),
      jenis: `Membership Payment - ${membership_plan || 'Bulanan'}`,
      paket: membership_plan || 'Bulanan',
      jumlah: amount,
      status: 'completed',
      metode_pembayaran: payment_method,
      bukti_pembayaran: bukti_pembayaran || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('💾 Saving transaction data:', transactionData);

    let transactionRef;
    try {
      transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
      console.log('✅ Transaction saved successfully with ID:', transactionRef.id);
    } catch (transactionError) {
      console.error('❌ Failed to save transaction:', transactionError);
      throw new Error('Gagal menyimpan transaksi: ' + transactionError.message);
    }

    // 2. Update status member di collection 'members'
    try {
      const memberDocRef = doc(db, 'members', member_id);
      const memberDoc = await getDoc(memberDocRef);

      if (memberDoc.exists()) {
        const now = new Date();
        const duration = membership_plan === 'Bulanan' ? 30 : 
                       membership_plan === 'Triwulan' ? 90 :
                       membership_plan === 'Semester' ? 180 : 365;
        
        const masaAktif = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

        const updateData = {
          status: 'active',
          membership_plan: membership_plan || 'Bulanan',
          membership_price: amount,
          tanggal_daftar: serverTimestamp(),
          masa_aktif: masaAktif.toISOString(),
          last_payment_date: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        console.log('🔄 Updating member data:', updateData);

        await updateDoc(memberDocRef, updateData);
        console.log('✅ Member status updated to active:', member_id);

        // 3. Juga update di collection 'users'
        await updateUserCollection(member_id, membership_plan, amount, masaAktif);

      } else {
        console.log('❌ Member not found in members collection:', member_id);
        throw new Error('Data member tidak ditemukan');
      }
    } catch (memberError) {
      console.error('❌ Failed to update member:', memberError);
      throw new Error('Gagal update status member: ' + memberError.message);
    }

    console.log('✅ Payment completed successfully for:', member_id);

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil! Status member telah aktif.',
      transactionId: transactionRef.id,
      note: 'Akun Anda sekarang aktif'
    });

  } catch (error) {
    console.error('❌ Member payment error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses pembayaran'
    }, { status: 500 });
  }
}

// Helper function untuk update user collection
async function updateUserCollection(member_id, membership_plan, amount, masaAktif) {
  try {
    const userDocRef = doc(db, 'users', member_id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const updateData = {
        status: 'active',
        membership_plan: membership_plan || 'Bulanan',
        membership_price: amount,
        last_payment_date: serverTimestamp(),
        masa_aktif: masaAktif.toISOString(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(userDocRef, updateData);
      console.log('✅ User status updated to active:', member_id);
    } else {
      console.log('❌ User not found in users collection:', member_id);
    }
  } catch (error) {
    console.error('❌ Cannot update user collection:', error.message);
    // Tidak throw error di sini karena update members sudah berhasil
  }
}