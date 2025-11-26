import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { nama, email, password, telepon, paket, payment_method = 'transfer' } = await request.json();

    console.log('Registration attempt for:', nama);

    // 1. Validasi input
    if (!nama || !password || !telepon || !paket) {
      return NextResponse.json(
        { success: false, error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // 2. Generate username otomatis HANYA UNTUK MEMBER
    const countMemberQuery = 'SELECT COUNT(*) as count FROM users WHERE role = "member"';
    const countResult: any = await query(countMemberQuery);
    const urutanMember = countResult[0].count + 1;
    
    let generatedUsername = `Member_${urutanMember.toString().padStart(3, '0')}`;

    // 3. Cek apakah generated username sudah ada
    const checkUserQuery = 'SELECT id_user FROM users WHERE username = ?';
    const existingUsers: any = await query(checkUserQuery, [generatedUsername]);

    if (existingUsers.length > 0) {
      const timestamp = Date.now().toString().slice(-3);
      generatedUsername = `Member_${urutanMember.toString().padStart(3, '0')}_${timestamp}`;
    }

    // 4. Hitung harga dan masa aktif berdasarkan paket
    const planPrices: { [key: string]: number } = {
      'bulanan': 120000,
      'triwulan': 300000,
      'semester': 550000,
      'tahunan': 1000000
    };

    const total = planPrices[paket] || 120000;

    // Hitung masa aktif
    const today = new Date();
    const masaAktif = new Date();
    
    switch (paket) {
      case 'bulanan':
        masaAktif.setMonth(today.getMonth() + 1);
        break;
      case 'triwulan':
        masaAktif.setMonth(today.getMonth() + 3);
        break;
      case 'semester':
        masaAktif.setMonth(today.getMonth() + 6);
        break;
      case 'tahunan':
        masaAktif.setFullYear(today.getFullYear() + 1);
        break;
      default:
        masaAktif.setMonth(today.getMonth() + 1);
    }

    // 5. Generate E-Card code
    const countEcardQuery = 'SELECT COUNT(*) as count FROM members';
    const countEcardResult: any = await query(countEcardQuery);
    const urutanEcard = countEcardResult[0].count + 1;
    const ecardCode = `MEM-${urutanEcard.toString().padStart(3, '0')}`;

    // 6. Insert ke tabel users
    const insertUserQuery = `
      INSERT INTO users (username, password, role, created_at) 
      VALUES (?, ?, 'member', NOW())
    `;
    
    const userResult: any = await query(insertUserQuery, [generatedUsername, password]);
    const userId = userResult.insertId;

    // 7. Insert ke tabel members dan DAPATKAN id_member
    const insertMemberQuery = `
      INSERT INTO members (
        user_id,
        nama, 
        telepon,
        password, 
        tanggal_daftar, 
        masa_aktif, 
        ecard_code,
        status_pembayaran
      ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'pending')
    `;
    
    const memberResult: any = await query(insertMemberQuery, [
      userId,
      nama, 
      telepon,
      password,
      masaAktif.toISOString().split('T')[0],
      ecardCode
    ]);

    const memberId = memberResult.insertId; // ✅ INI id_member yang benar

    // 8. Buat transaksi pembayaran dengan id_member yang benar
    const transactionQuery = `
      INSERT INTO transactions (
        id_member,
        jenis_pengunjung,
        total,
        metode_pembayaran,
        status_pembayaran,
        waktu_transaksi
      ) VALUES (?, 'member', ?, ?, 'pending', NOW())
    `;
    
    const transactionResult: any = await query(transactionQuery, [
      memberId, // ✅ GUNAKAN memberId, BUKAN userId
      total,
      payment_method
    ]);

    const transactionId = transactionResult.insertId;

    console.log('Registration successful (pending payment) for user:', generatedUsername);

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Silakan selesaikan pembayaran untuk mengaktifkan akun.',
      data: {
        id: userId,
        member_id: memberId, // ✅ KIRIM JUGA member_id
        username: generatedUsername,
        nama,
        telepon,
        paket,
        masa_aktif: masaAktif.toISOString().split('T')[0],
        ecard_code: ecardCode,
        total_bayar: total,
        transaction_id: transactionId,
        status: 'pending_payment'
      }
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server saat pendaftaran' 
      },
      { status: 500 }
    );
  }
}