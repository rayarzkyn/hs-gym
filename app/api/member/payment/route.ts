import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { member_id, payment_method, amount, bukti_pembayaran } = await request.json();

    console.log('Processing payment for member:', member_id);

    // 1. Update status transaksi menjadi success
    const updateTransactionQuery = `
      UPDATE transactions 
      SET metode_pembayaran = ?, status_pembayaran = 'success', bukti_pembayaran = ?
      WHERE id_member = ? AND status_pembayaran = 'pending'
    `;
    
    await query(updateTransactionQuery, [payment_method, bukti_pembayaran, member_id]);

    // 2. Update status pembayaran di tabel members
    const updateMemberQuery = `
      UPDATE members 
      SET status_pembayaran = 'completed'
      WHERE id_member = ?
    `;
    
    await query(updateMemberQuery, [member_id]);

    console.log('Payment completed for member:', member_id);

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil! Status member telah aktif.'
    });

  } catch (error: any) {
    console.error('Member payment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat memproses pembayaran' 
      },
      { status: 500 }
    );
  }
}