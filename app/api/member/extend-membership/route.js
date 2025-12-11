// app/api/member/extend-membership/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs 
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { memberId, plan, price, paymentMethod } = body;

    console.log('📝 Processing membership extension for:', memberId);

    if (!memberId || !plan || !price) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Cari member
    let memberDocRef = doc(db, 'members', memberId);
    let memberDoc = await getDoc(memberDocRef);

    if (!memberDoc.exists()) {
      memberDocRef = doc(db, 'users', memberId);
      memberDoc = await getDoc(memberDocRef);
    }

    if (!memberDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Member tidak ditemukan'
      }, { status: 404 });
    }

    const memberData = memberDoc.data();
    console.log('✅ Member found:', memberData.nama || memberData.fullName);

    // Hitung tanggal baru
    const currentExpiry = memberData.masa_aktif ? 
      (memberData.masa_aktif.toDate ? memberData.masa_aktif.toDate() : new Date(memberData.masa_aktif)) : 
      new Date();
    
    const now = new Date();
    const startDate = currentExpiry > now ? currentExpiry : now;
    
    // Hitung durasi berdasarkan paket yang dipilih
    let monthsToAdd = 1;
    let daysToAdd = 30;
    
    switch (plan) {
      case 'Triwulan':
        monthsToAdd = 3;
        daysToAdd = 90;
        break;
      case 'Semester':
        monthsToAdd = 6;
        daysToAdd = 180;
        break;
      case 'Tahunan':
        monthsToAdd = 12;
        daysToAdd = 365;
        break;
      default: // Bulanan
        monthsToAdd = 1;
        daysToAdd = 30;
    }
    
    const newExpiry = new Date(startDate);
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);

    // Buat ID transaksi
    const transactionId = `EXT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Simpan transaksi pending
    const transactionData = {
      id: transactionId,
      member_id: memberId,
      memberId: memberId,
      nama_member: memberData.nama || memberData.fullName,
      tanggal: serverTimestamp(),
      jenis: `Perpanjangan Membership - ${plan}`,
      paket: plan,
      jumlah: price,
      status: 'pending',
      metode_pembayaran: paymentMethod || 'transfer',
      masa_aktif_lama: memberData.masa_aktif,
      masa_aktif_baru: newExpiry.toISOString(),
      durasi_perpanjangan: `${daysToAdd} hari (${monthsToAdd} bulan)`,
      is_extension: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('💾 Saving extension transaction');

    // Simpan ke transactions
    const transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
    console.log('✅ Transaction saved:', transactionRef.id);

    // Update member dengan pending extension
    const updateData = {
      pending_extension: {
        transaction_id: transactionRef.id,
        plan: plan,
        price: price,
        new_expiry: newExpiry.toISOString(),
        duration: `${daysToAdd} hari`,
        requested_at: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };

    await updateDoc(memberDocRef, updateData);
    console.log('✅ Member updated with pending extension');

    return NextResponse.json({
      success: true,
      message: 'Permintaan perpanjangan berhasil dibuat',
      data: {
        transactionId: transactionRef.id,
        amount: price,
        plan: plan,
        duration: `${daysToAdd} hari (${monthsToAdd} bulan)`,
        newExpiry: newExpiry.toISOString(),
        redirectUrl: `/member/payment?type=extension&transactionId=${transactionRef.id}`
      },
      redirectTo: `/member/payment?type=extension&transactionId=${transactionRef.id}`
    });

  } catch (error) {
    console.error('❌ Membership extension error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses perpanjangan'
    }, { status: 500 });
  }
}