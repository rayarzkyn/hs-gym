import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const pendingPaymentsQuery = `
      SELECT 
        t.id_transaksi,
        t.total,
        t.metode_pembayaran,
        t.bukti_pembayaran,
        t.waktu_transaksi,
        t.jenis_pengunjung,
        m.nama as member_nama,
        m.ecard_code,
        m.telepon,
        u.username,
        DATEDIFF(CURDATE(), DATE(t.waktu_transaksi)) as hari_pending
      FROM transactions t
      LEFT JOIN members m ON t.id_member = m.id_member
      LEFT JOIN users u ON m.user_id = u.id_user
      WHERE t.status_pembayaran = 'pending'
      ORDER BY t.waktu_transaksi DESC
    `;
    
    const pendingPayments: any = await query(pendingPaymentsQuery);

    return NextResponse.json({
      success: true,
      data: pendingPayments
    });

  } catch (error: any) {
    console.error('Pending payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { transactionId, action, adminId } = await request.json(); // action: 'approve' or 'reject'

    if (!transactionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID dan action diperlukan' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'success' : 'failed';

    // Update transaction status
    const updateQuery = `
      UPDATE transactions 
      SET status_pembayaran = ?
      WHERE id_transaksi = ?
    `;
    
    await query(updateQuery, [newStatus, transactionId]);

    // If approved, update member status
    if (action === 'approve') {
      const memberUpdateQuery = `
        UPDATE members m
        JOIN transactions t ON m.id_member = t.id_member
        SET m.status_pembayaran = 'completed',
            m.tanggal_daftar = CURDATE(),
            m.masa_aktif = DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
        WHERE t.id_transaksi = ?
      `;
      await query(memberUpdateQuery, [transactionId]);
    }

    // Log the action
    const logQuery = `
      INSERT INTO audit_log (user_id, action, description, ip_address)
      VALUES (?, ?, ?, ?)
    `;
    await query(logQuery, [
      adminId, 
      `payment_${action}`, 
      `Transaction ${transactionId} ${action}ed`,
      '127.0.0.1' // In production, get from request
    ]);

    return NextResponse.json({
      success: true,
      message: `Pembayaran berhasil di${action === 'approve' ? 'setujui' : 'tolak'}`
    });

  } catch (error: any) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}