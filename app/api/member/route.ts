import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Query untuk mendapatkan semua member dengan pagination
    const membersQuery = `
      SELECT 
        m.id_member,
        m.nama,
        m.telepon,
        m.tanggal_daftar,
        m.masa_aktif,
        m.ecard_code,
        m.status_pembayaran,
        m.created_at,
        u.username,
        u.role
      FROM members m
      JOIN users u ON m.user_id = u.id_user
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const members: any = await query(membersQuery, [limit, offset]);

    // Query untuk total count
    const countQuery = 'SELECT COUNT(*) as total FROM members';
    const countResult: any = await query(countQuery);
    const total = countResult[0].total;

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { nama, telepon, paket, payment_method = 'cash' } = await request.json();

    // Validasi
    if (!nama || !telepon || !paket) {
      return NextResponse.json(
        { success: false, error: 'Nama, telepon, dan paket harus diisi' },
        { status: 400 }
      );
    }

    // Generate username otomatis
    const countUserQuery = 'SELECT COUNT(*) as count FROM users WHERE role = "member"';
    const countResult: any = await query(countUserQuery);
    const urutanUser = countResult[0].count + 1;
    const generatedUsername = `Member_${urutanUser.toString().padStart(3, '0')}`;

    // Generate password default (telepon)
    const defaultPassword = telepon;

    // Hitung harga dan masa aktif
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
    masaAktif.setMonth(today.getMonth() + 1);

    // Generate E-Card
    const countEcardQuery = 'SELECT COUNT(*) as count FROM members';
    const countEcardResult: any = await query(countEcardQuery);
    const urutanEcard = countEcardResult[0].count + 1;
    const ecardCode = `MEM-${urutanEcard.toString().padStart(3, '0')}`;

    // Insert user
    const insertUserQuery = `
      INSERT INTO users (username, password, role, created_at) 
      VALUES (?, ?, 'member', NOW())
    `;
    
    const userResult: any = await query(insertUserQuery, [generatedUsername, defaultPassword]);
    const userId = userResult.insertId;

    // Insert member
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
      ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'completed')
    `;
    
    const memberResult: any = await query(insertMemberQuery, [
      userId,
      nama, 
      telepon,
      defaultPassword,
      masaAktif.toISOString().split('T')[0],
      ecardCode
    ]);

    const memberId = memberResult.insertId;

    // Buat transaksi (jika perlu)
    const transactionQuery = `
      INSERT INTO transactions (
        id_member,
        jenis_pengunjung,
        total,
        metode_pembayaran,
        status_pembayaran,
        waktu_transaksi
      ) VALUES (?, 'member', ?, ?, 'success', NOW())
    `;
    
    await query(transactionQuery, [memberId, total, payment_method]);

    return NextResponse.json({
      success: true,
      message: 'Member berhasil dibuat',
      data: {
        id: userId,
        member_id: memberId,
        username: generatedUsername,
        password: defaultPassword,
        nama,
        telepon,
        paket,
        ecard_code: ecardCode,
        masa_aktif: masaAktif.toISOString().split('T')[0]
      }
    });

  } catch (error: any) {
    console.error('Create member error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}