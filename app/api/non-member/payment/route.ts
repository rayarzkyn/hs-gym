import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { payment_method } = await request.json();

    // 1. Hitung urutan harian untuk hari ini
    const today = new Date().toISOString().split('T')[0];
    
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM non_member_daily 
      WHERE tanggal_kunjungan = ?
    `;
    
    const countResult: any = await query(countQuery, [today]);
    const urutanHarian = countResult[0].count + 1;

    // 2. Generate kode login unik
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    const username = `pelanggan-${urutanHarian}-${day}-${month}-${year}`;
    
    // 3. Generate password acak (6 digit)
    const password = Math.random().toString(36).slice(-6).toUpperCase();
    
    // 4. Generate E-Card code
    const ecardCode = `NMD-${urutanHarian.toString().padStart(3, '0')}`;

    // 5. Set expired time
    const expiredAt = new Date();
    expiredAt.setHours(23, 59, 59, 0);

    // 6. Simpan ke tabel non_member_daily
    const insertNonMemberQuery = `
      INSERT INTO non_member_daily (
        kode_login, 
        tanggal_kunjungan, 
        urutan_harian, 
        ecard_code, 
        expired_at,
        password,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const nonMemberResult: any = await query(insertNonMemberQuery, [
      username,
      today,
      urutanHarian,
      ecardCode,
      expiredAt,
      password
    ]);

    const idNonmemberDaily = nonMemberResult.insertId;

    // 7. Simpan transaksi
    const transactionQuery = `
      INSERT INTO transactions (
        jenis_pengunjung,
        id_nonmember_daily,
        total,
        metode_pembayaran,
        waktu_transaksi,
        created_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(transactionQuery, [
      'nonmember',
      idNonmemberDaily,
      15000,
      payment_method
    ]);

    return NextResponse.json({
  success: true,
  username: username,
  password: password,
  ecard_code: ecardCode,
  urutan_harian: urutanHarian,
  tanggal_kunjungan: today,
  expired_at: expiredAt,
  message: 'Pembayaran berhasil!'
});

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat memproses pembayaran'
      },
      { status: 500 }
    );
  }
}