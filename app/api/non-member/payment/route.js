import { NextResponse } from 'next/server';
import { createNonMemberDaily, createNonMemberTransaction } from '../../../../lib/non-member-firebase';

export async function POST(request) {
  try {
    const paymentData = await request.json();
    
    const {
      nama,
      email,
      telepon,
      payment_method,
      harga = 15000
    } = paymentData;

    console.log('💳 Processing non-member daily payment for:', nama);

    // Validasi data
    if (!nama || !telepon || !payment_method) {
      return NextResponse.json({
        success: false,
        error: 'Data tidak lengkap. Nama, telepon, dan metode pembayaran wajib diisi.'
      }, { status: 400 });
    }

    // 1. Buat non-member daily
    const nonMemberResult = await createNonMemberDaily({
      nama,
      email: email || '',
      telepon,
      harga,
      payment_method
    });

    if (!nonMemberResult.success) {
      throw new Error(nonMemberResult.error);
    }

    const dailyCode = nonMemberResult.daily_code;
    console.log('✅ Non-member created with code:', dailyCode);

    // 2. Buat transaction record
    const transactionResult = await createNonMemberTransaction({
      daily_code: dailyCode,
      nama: nama,
      jumlah: harga,
      metode_pembayaran: payment_method,
      status: 'completed',
      tanggal: new Date()
    });

    if (!transactionResult.success) {
      throw new Error(transactionResult.error);
    }

    console.log('✅ Transaction created:', transactionResult.transaction_id);

    return NextResponse.json({
  success: true,
  message: 'Pembayaran berhasil! Kredensial login telah dibuat.',
  data: {
    daily_code: dailyCode,
    username: nonMemberResult.username, // Tambahkan ini
    password: nonMemberResult.password, // Tambahkan ini
    nama: nama,
    harga: harga,
    payment_method: payment_method,
    transaction_id: transactionResult.transaction_id,
    expired_at: nonMemberResult.data.expired_at
  }
});

  } catch (error) {
    console.error('❌ Non-member payment error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses pembayaran'
    }, { status: 500 });
  }
}

export async function GET(request) {
  // Untuk testing - return sample payment methods
  return NextResponse.json({
    success: true,
    data: {
      payment_methods: [
        { id: 'qris', name: 'QRIS', desc: 'Scan QR Code', icon: '📱' },
        { id: 'cash', name: 'Tunai', desc: 'Bayar di tempat', icon: '💵' },
        { id: 'transfer', name: 'Transfer Bank', desc: 'BCA, BNI, Mandiri, BRI', icon: '🏦' },
        { id: 'ewallet', name: 'E-Wallet', desc: 'Gopay, OVO, Dana', icon: '💳' }
      ],
      harga_standar: 15000
    }
  });
}