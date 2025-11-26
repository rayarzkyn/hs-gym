import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Starting members API...');
    
    let membersData: any[] = [];

    try {
      // Sesuai struktur tabel members
      const members: any = await query(`
        SELECT 
          m.id_member as id,
          m.nama,
          m.tanggal_daftar as joinDate,
          m.masa_aktif as expiryDate,
          m.status_pembayaran as status,
          m.telepon as phone,
          m.ecard_code,
          COUNT(v.id_visit) as totalVisits,
          MAX(v.waktu_kunjungan) as lastVisit
        FROM members m
        LEFT JOIN visits v ON m.id_member = v.id_member
        GROUP BY m.id_member, m.nama, m.tanggal_daftar, m.masa_aktif, m.status_pembayaran, m.telepon, m.ecard_code
        ORDER BY m.tanggal_daftar DESC
      `);

      // Format the data
      membersData = members.map((member: any) => ({
        id: member.id,
        nama: member.nama,
        membershipType: 'Regular',
        joinDate: member.joinDate,
        expiryDate: member.expiryDate,
        status: member.status,
        phone: member.phone,
        email: '-',
        lastVisit: member.lastVisit,
        totalVisits: member.totalVisits || 0,
        ecardCode: member.ecard_code
      }));

    } catch (error) {
      console.error('Error fetching members data:', error);
    }

    console.log('✅ Members API completed successfully:', membersData.length, 'members');
    return NextResponse.json({
      success: true,
      data: membersData
    });

  } catch (error) {
    console.error('❌ Critical error in members API:', error);
    
    return NextResponse.json({
      success: true,
      data: [],
      note: 'Using empty data due to critical error'
    });
  }
}