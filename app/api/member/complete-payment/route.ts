    import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { user_id, transaction_id, bukti_pembayaran } = await request.json();

    // 1. Update status transaksi
    const updateTransactionQuery = `
      UPDATE transactions 
      SET status = 'completed', bukti_pembayaran = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    
    await query(updateTransactionQuery, [bukti_pembayaran, transaction_id, user_id]);

    // 2. Update status member
    const updateMemberQuery = `
      UPDATE members 
      SET status_pembayaran = 'completed'
      WHERE user_id = ?
    `;
    
    await query(updateMemberQuery, [user_id]);

    // 3. Update masa aktif mulai dari hari ini
    const updateMasaAktifQuery = `
      UPDATE members 
      SET tanggal_daftar = CURDATE(),
          masa_aktif = DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
      WHERE user_id = ?
    `;
    
    await query(updateMasaAktifQuery, [user_id]);

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil! Akun Anda sekarang aktif.'
    });

  } catch (error: any) {
    console.error('Complete payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat memproses pembayaran' },
      { status: 500 }
    );
  }
}