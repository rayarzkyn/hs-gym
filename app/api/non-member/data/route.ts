// app/api/non-member/data/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kodeLogin = searchParams.get('kode_login');

    if (!kodeLogin) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kode login diperlukan' 
        },
        { status: 400 }
      );
    }

    // Ambil data non-member dari database
    const dataQuery = `
      SELECT 
        kode_login, 
        ecard_code, 
        tanggal_kunjungan, 
        expired_at,
        urutan_harian
      FROM non_member_daily 
      WHERE kode_login = ? AND expired_at > NOW()
    `;
    
    const dataResult: any = await query(dataQuery, [kodeLogin]);

    if (dataResult.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data tidak ditemukan atau sudah expired' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dataResult[0]
    });

  } catch (error) {
    console.error('Error fetching non-member data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan server' 
      },
      { status: 500 }
    );
  }
}