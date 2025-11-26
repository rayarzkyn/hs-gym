import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { type, startDate, endDate, format = 'excel' } = await request.json();

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Type, startDate, dan endDate diperlukan' },
        { status: 400 }
      );
    }

    let queryStr = '';
    let filename = '';

    switch (type) {
      case 'transactions':
        queryStr = `
          SELECT 
            t.id_transaksi,
            t.waktu_transaksi,
            t.total,
            t.metode_pembayaran,
            t.status_pembayaran,
            COALESCE(m.nama, 'Non-Member') as customer_name,
            m.ecard_code,
            CASE 
              WHEN t.jenis_pengunjung = 'member' THEN 'Membership'
              WHEN t.jenis_pengunjung = 'non_member' THEN 'Day Pass'
              ELSE t.jenis_pengunjung
            END as jenis_layanan
          FROM transactions t
          LEFT JOIN members m ON t.id_member = m.id_member
          WHERE DATE(t.waktu_transaksi) BETWEEN ? AND ?
          ORDER BY t.waktu_transaksi DESC
        `;
        filename = `laporan-transaksi-${startDate}-to-${endDate}`;
        break;

      case 'members':
        queryStr = `
          SELECT 
            m.id_member,
            m.nama,
            m.telepon,
            m.ecard_code,
            m.tanggal_daftar,
            m.masa_aktif,
            m.status_pembayaran,
            u.username,
            (SELECT COUNT(*) FROM transactions t WHERE t.id_member = m.id_member AND t.status_pembayaran = 'success') as total_transaksi
          FROM members m
          JOIN users u ON m.user_id = u.id_user
          WHERE DATE(m.tanggal_daftar) BETWEEN ? AND ?
          ORDER BY m.tanggal_daftar DESC
        `;
        filename = `laporan-member-${startDate}-to-${endDate}`;
        break;

      case 'financial':
        queryStr = `
          SELECT 
            DATE(waktu_transaksi) as tanggal,
            SUM(total) as pendapatan,
            COUNT(*) as jumlah_transaksi,
            AVG(total) as rata_rata
          FROM transactions 
          WHERE status_pembayaran = 'success'
            AND DATE(waktu_transaksi) BETWEEN ? AND ?
          GROUP BY DATE(waktu_transaksi)
          ORDER BY tanggal
        `;
        filename = `laporan-keuangan-${startDate}-to-${endDate}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Type laporan tidak valid' },
          { status: 400 }
        );
    }

    const data: any = await query(queryStr, [startDate, endDate]);

    // In production, you would generate actual Excel/PDF files here
    // For now, we return JSON that can be converted on frontend
    return NextResponse.json({
      success: true,
      data: {
        type,
        format,
        filename: `${filename}.${format}`,
        data: data,
        generatedAt: new Date().toISOString(),
        period: `${startDate} to ${endDate}`
      }
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}