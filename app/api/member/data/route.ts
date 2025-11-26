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

    // Ambil data member dengan status pembayaran
    const memberQuery = `
      SELECT 
        m.id_member,
        m.nama,
        m.telepon,
        m.tanggal_daftar,
        m.masa_aktif,
        m.ecard_code,
        m.status_pembayaran,
        u.username,
        u.id_user
      FROM members m
      JOIN users u ON m.user_id = u.id_user
      WHERE m.id_member = ? OR u.id_user = ?
    `;
    
    const members: any = await query(memberQuery, [memberId, memberId]);

    if (members.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data member tidak ditemukan' },
        { status: 404 }
      );
    }

    const member = members[0];

    // Tentukan paket berdasarkan masa aktif
    let paket_keanggotaan = 'Bulanan';
    const tanggalDaftar = new Date(member.tanggal_daftar);
    const masaAktif = new Date(member.masa_aktif);
    const diffMonths = (masaAktif.getFullYear() - tanggalDaftar.getFullYear()) * 12 + (masaAktif.getMonth() - tanggalDaftar.getMonth());
    
    if (diffMonths >= 12) paket_keanggotaan = 'Tahunan';
    else if (diffMonths >= 6) paket_keanggotaan = 'Semester';
    else if (diffMonths >= 3) paket_keanggotaan = 'Triwulan';

    return NextResponse.json({
      success: true,
      data: {
        id_member: member.id_member,
        user_id: member.id_user,
        nomor_member: member.id_member,
        e_card_number: member.ecard_code,
        paket_keanggotaan: paket_keanggotaan,
        tanggal_bergabung: member.tanggal_daftar,
        tanggal_berakhir: member.masa_aktif,
        status: member.status_pembayaran === 'completed' ? 'active' : 'pending',
        status_pembayaran: member.status_pembayaran
      }
    });

  } catch (error: any) {
    console.error('Member data error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}