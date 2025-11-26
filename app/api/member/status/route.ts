import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
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

    // Cek status pembayaran terbaru dari transactions
    const paymentQuery = `
      SELECT status_pembayaran, total, metode_pembayaran, waktu_transaksi
      FROM transactions 
      WHERE id_member = ? 
      ORDER BY waktu_transaksi DESC 
      LIMIT 1
    `;
    
    const payments: any = await query(paymentQuery, [memberId]);
    console.log('💳 Transactions result:', payments);

    // Cek status di tabel members
    const memberQuery = `
      SELECT status_pembayaran 
      FROM members 
      WHERE id_member = ? OR user_id = ?
    `;
    
    const members: any = await query(memberQuery, [memberId, memberId]);
    console.log('👤 Members result:', members);
    
    const memberStatus = members.length > 0 ? members[0].status_pembayaran : 'unknown';

    // Prioritaskan status dari members table
    let finalStatus = memberStatus;
    if (payments.length > 0) {
      // Jika ada transaksi, gunakan status dari transactions
      finalStatus = payments[0].status_pembayaran;
    }

    console.log('🎯 Final payment status:', finalStatus);

    return NextResponse.json({
      success: true,
      payment_status: finalStatus,
      member_status: memberStatus,
      amount: payments.length > 0 ? payments[0].total : 0,
      payment_method: payments.length > 0 ? payments[0].metode_pembayaran : null,
      payment_date: payments.length > 0 ? payments[0].waktu_transaksi : null
    });

  } catch (error: any) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}