import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    console.log('🔐 Login attempt for:', username);

    // 1. Cek di tabel users terlebih dahulu
    const userQuery = `
      SELECT 
        u.id_user,
        u.username, 
        u.password,
        u.role,
        u.created_at as user_created
      FROM users u 
      WHERE u.username = ? AND u.password = ?
    `;
    
    const users: any = await query(userQuery, [username, password]);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ User found in users table:', user);
      
      // Cari data member berdasarkan user_id
      const memberQuery = `
        SELECT 
          m.id_member,
          m.nama,
          m.telepon,
          m.tanggal_daftar,
          m.masa_aktif,
          m.ecard_code,
          m.status_pembayaran
        FROM members m 
        WHERE m.user_id = ?
      `;
      const members: any = await query(memberQuery, [user.id_user]);
      const memberData = members.length > 0 ? members[0] : null;
      
      // ✅ CEK STATUS PEMBAYARAN - TOLAK JIKA BELUM BAYAR
      if (memberData) {
        // Cek status pembayaran di tabel members
        if (memberData.status_pembayaran !== 'completed') {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Akun belum aktif. Silakan selesaikan pembayaran terlebih dahulu.' 
            },
            { status: 403 }
          );
        }

        // Juga cek di tabel transactions untuk konfirmasi
        const paymentQuery = `
          SELECT status_pembayaran 
          FROM transactions 
          WHERE id_member = ? 
          ORDER BY waktu_transaksi DESC 
          LIMIT 1
        `;
        const payments: any = await query(paymentQuery, [memberData.id_member]);
        
        if (payments.length > 0 && payments[0].status_pembayaran !== 'success') {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Pembayaran belum dikonfirmasi. Silakan tunggu konfirmasi admin.' 
            },
            { status: 403 }
          );
        }
      }

      // Siapkan data user untuk response
      const userData: any = {
        id: user.id_user,
        username: user.username,
        nama: user.username, // default
        role: user.role
      };

      // Jika ada data member, tambahkan informasi member
      if (memberData) {
        userData.nama = memberData.nama;
        userData.member_id = memberData.id_member;
        userData.masa_aktif = memberData.masa_aktif;
        userData.ecard_code = memberData.ecard_code;
        userData.telepon = memberData.telepon;
        userData.tanggal_daftar = memberData.tanggal_daftar;
        userData.status_pembayaran = memberData.status_pembayaran;
      }

      console.log('📤 Sending user data to client:', userData);

      return NextResponse.json({
        success: true,
        user: userData,
        token: 'dummy-token'
      });
    }

    // 2. Cek login dengan E-Card + Password dari tabel members
    const memberWithPasswordQuery = `
      SELECT 
        m.id_member,
        m.user_id,
        m.nama,
        m.telepon,
        m.password as member_password,
        m.tanggal_daftar,
        m.masa_aktif,
        m.ecard_code,
        m.status_pembayaran,
        u.id_user,
        u.username,
        u.password as user_password,
        u.role
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id_user
      WHERE (u.username = ? OR m.ecard_code = ?) 
        AND (u.password = ? OR m.password = ?)
    `;

    const memberLogin: any = await query(memberWithPasswordQuery, [
      username, 
      username, 
      password, 
      password
    ]);

    if (memberLogin.length > 0) {
      const data = memberLogin[0];
      
      // ✅ CEK STATUS PEMBAYARAN - TOLAK JIKA BELUM BAYAR
      if (data.status_pembayaran !== 'completed') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Akun belum aktif. Silakan selesaikan pembayaran terlebih dahulu.' 
          },
          { status: 403 }
        );
      }

      // Juga cek di tabel transactions untuk konfirmasi
      const paymentQuery = `
        SELECT status_pembayaran 
        FROM transactions 
        WHERE id_member = ? 
        ORDER BY waktu_transaksi DESC 
        LIMIT 1
      `;
      const payments: any = await query(paymentQuery, [data.id_member]);
      
      if (payments.length > 0 && payments[0].status_pembayaran !== 'success') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Pembayaran belum dikonfirmasi. Silakan tunggu konfirmasi admin.' 
          },
          { status: 403 }
        );
      }

      console.log('✅ Member login successful with E-Card:', data);
      
      const userData = {
        id: data.id_user || data.user_id,
        username: data.username || data.ecard_code,
        nama: data.nama,
        role: data.role || 'member',
        member_id: data.id_member,
        masa_aktif: data.masa_aktif,
        ecard_code: data.ecard_code,
        telepon: data.telepon,
        tanggal_daftar: data.tanggal_daftar,
        status_pembayaran: data.status_pembayaran
      };

      console.log('📤 Sending member data to client:', userData);

      return NextResponse.json({
        success: true,
        user: userData,
        token: 'dummy-token'
      });
    }

    // 3. Cek non_member_daily
    const nonMemberQuery = `
      SELECT 
        kode_login as username,
        ecard_code,
        tanggal_kunjungan,
        expired_at,
        urutan_harian
      FROM non_member_daily 
      WHERE kode_login = ? AND password = ? AND expired_at > NOW()
    `;
    
    const nonMembers: any = await query(nonMemberQuery, [username, password]);

    if (nonMembers.length > 0) {
      const nonMember = nonMembers[0];
      console.log('✅ Non-member login successful');
      
      const userData = {
        id: nonMember.urutan_harian,
        username: nonMember.username,
        nama: `Non-Member ${nonMember.urutan_harian}`,
        role: 'non_member',
        ecard_code: nonMember.ecard_code,
        tanggal_kunjungan: nonMember.tanggal_kunjungan,
        expired_at: nonMember.expired_at,
        urutan_harian: nonMember.urutan_harian
      };

      return NextResponse.json({
        success: true,
        user: userData,
        token: 'dummy-token'
      });
    }

    console.log('❌ Login failed for username:', username);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Username/E-Card atau password salah' 
      },
      { status: 401 }
    );

  } catch (error: any) {
    console.error('💥 Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server' 
      },
      { status: 500 }
    );
  }
}