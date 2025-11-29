import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/firebase-client';

export async function POST(request) {
  try {
    const userData = await request.json();
    
    console.log('📝 Registering new member via API:', userData.username);

    // Validasi data yang diperlukan
    if (!userData.username || !userData.email || !userData.password || !userData.fullName) {
      return NextResponse.json({
        success: false,
        error: 'Data yang diperlukan tidak lengkap'
      }, { status: 400 });
    }

    const result = await registerUser(userData);

    if (result.success) {
      console.log('✅ API Registration successful for:', userData.username);
      
      return NextResponse.json({
        success: true,
        user: result.user,
        memberData: result.memberData,
        message: 'Registrasi berhasil! Silakan lanjutkan ke pembayaran.'
      });
    } else {
      console.error('❌ API Registration failed:', result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Registration API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat registrasi'
    }, { status: 500 });
  }
}