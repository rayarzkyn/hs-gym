import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/firebase-auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    console.log('🔐 Login attempt for:', username);

    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username dan password wajib diisi' 
        },
        { status: 400 }
      );
    }

    const result = await loginUser(username, password);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        message: 'Login berhasil!'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server saat login' 
      },
      { status: 500 }
    );
  }
}