import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Username dan password diperlukan' 
        },
        { status: 400 }
      );
    }

    const loginQuery = `
      SELECT 
        kode_login, 
        ecard_code, 
        tanggal_kunjungan, 
        expired_at,
        urutan_harian
      FROM non_member_daily 
      WHERE kode_login = ? AND password = ? AND expired_at > NOW()
    `;
    
    const result: any = await query(loginQuery, [username, password]);

    if (result.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Username/password salah atau sudah expired' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      kode_login: result[0].kode_login,
      ecard_code: result[0].ecard_code,
      urutan_harian: result[0].urutan_harian,
      tanggal_kunjungan: result[0].tanggal_kunjungan,
      expired_at: result[0].expired_at,
      message: 'Login berhasil!'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan server' 
      },
      { status: 500 }
    );
  }
}