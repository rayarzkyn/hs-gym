import { NextResponse } from 'next/server';
import { recordNonMemberVisit } from '../../../../lib/non-member-firebase';
import { db } from '../../../../lib/firebase-client';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    // Validasi input
    if (!username || !password) {
      console.error('❌ Missing credentials');
      return NextResponse.json({
        success: false,
        error: 'Username dan password diperlukan'
      }, { status: 400 });
    }
    
    console.log('🔐 Attempting non-member login with:', username);
    
    // Cari non-member berdasarkan username dan password
    let nonMemberQuery;
    try {
      nonMemberQuery = query(
        collection(db, 'non_members'),
        where('username', '==', username.toUpperCase()),
        where('password', '==', password),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(nonMemberQuery);
      
      if (querySnapshot.empty) {
        console.error('❌ Non-member not found or invalid credentials');
        return NextResponse.json({
          success: false,
          error: 'Username atau password salah, atau akun tidak aktif'
        }, { status: 400 });
      }
      
      const memberDoc = querySnapshot.docs[0];
      const memberData = memberDoc.data();
      
      console.log('✅ Non-member found:', memberData.nama);
      
      // Check expiration
      const now = new Date();
      let expiredAt;
      
      try {
        if (memberData.expired_at?.toDate) {
          expiredAt = memberData.expired_at.toDate();
        } else if (memberData.expired_at instanceof Date) {
          expiredAt = memberData.expired_at;
        } else if (typeof memberData.expired_at === 'string') {
          expiredAt = new Date(memberData.expired_at);
        } else {
          console.warn('⚠️ Invalid expiration date format, setting to now');
          expiredAt = now;
        }
      } catch (dateError) {
        console.error('❌ Error parsing expiration date:', dateError);
        expiredAt = now; // Fallback
      }
      
      if (now > expiredAt) {
        console.warn('⚠️ Daily pass expired for:', username);
        
        // Update status to expired
        try {
          await updateDoc(doc(db, 'non_members', memberDoc.id), {
            status: 'expired',
            updated_at: serverTimestamp()
          });
        } catch (updateError) {
          console.error('❌ Failed to update expired status:', updateError);
        }
        
        return NextResponse.json({
          success: false,
          error: 'Daily pass sudah kadaluarsa. Silakan beli daily pass baru.'
        }, { status: 400 });
      }
      
      // Auto check-in ketika login berhasil
      let visitResult = { success: false };
      try {
        visitResult = await recordNonMemberVisit({
          daily_code: memberData.daily_code,
          username: username,
          nama: memberData.nama,
          location: 'Main Gym Area',
          status: 'active',
          login_type: 'non_member_daily'
        });
        
        if (visitResult.success) {
          console.log('✅ Visit recorded successfully');
        }
      } catch (visitError) {
        console.warn('⚠️ Failed to record visit:', visitError);
        // Continue with login even if visit recording fails
      }
      
      // Prepare user session data
      const userData = {
        daily_code: memberData.daily_code,
        username: username,
        nama: memberData.nama,
        email: memberData.email || '',
        telepon: memberData.telepon || '',
        harga: memberData.harga || 0,
        status: memberData.status,
        tanggal_daftar: memberData.tanggal_daftar,
        expired_at: memberData.expired_at,
        role: 'non_member_daily',
        login_time: new Date().toISOString(),
        visit_id: visitResult.visit_id || null
      };
      
      console.log('✅ Non-member login successful:', memberData.nama);
      
      return NextResponse.json({
        success: true,
        message: visitResult.success 
          ? 'Login berhasil! Check-in otomatis dicatat.' 
          : 'Login berhasil!',
        data: userData
      });
      
    } catch (firestoreError) {
      console.error('❌ Firestore query error:', firestoreError);
      
      // Handle specific Firestore errors
      if (firestoreError.code === 'unavailable') {
        return NextResponse.json({
          success: false,
          error: 'Layanan database tidak tersedia. Periksa koneksi internet Anda.'
        }, { status: 503 });
      }
      
      if (firestoreError.code === 'permission-denied') {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak. Hubungi administrator.'
        }, { status: 403 });
      }
      
      throw firestoreError;
    }
    
  } catch (error) {
    console.error('❌ Non-member login error:', error);
    
    // Handle network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return NextResponse.json({
        success: false,
        error: 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat login. Silakan coba lagi.'
    }, { status: 500 });
  }
}