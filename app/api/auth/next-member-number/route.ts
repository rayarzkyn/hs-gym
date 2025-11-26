import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Hitung jumlah MEMBER saja (bukan semua user) ✅ PERBAIKAN
    const countMemberQuery = 'SELECT COUNT(*) as count FROM users WHERE role = "member"';
    const countResult: any = await query(countMemberQuery);
    const nextNumber = countResult[0].count + 1;

    // Hitung juga untuk E-Card
    const countEcardQuery = 'SELECT COUNT(*) as count FROM members';
    const countEcardResult: any = await query(countEcardQuery);
    const nextEcardNumber = countEcardResult[0].count + 1;

    return NextResponse.json({
      success: true,
      nextNumber: nextNumber,
      nextEcardNumber: nextEcardNumber
    });

  } catch (error: any) {
    console.error('Error fetching next member number:', error);
    return NextResponse.json({
      success: true,
      nextNumber: 1,
      nextEcardNumber: 1
    });
  }
}