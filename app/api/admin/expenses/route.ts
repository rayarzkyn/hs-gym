import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    const expensesQuery = `
      SELECT 
        e.*,
        u.username as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id_user
      WHERE MONTH(e.tanggal) = ? AND YEAR(e.tanggal) = ?
      ORDER BY e.tanggal DESC
    `;
    
    const expenses: any = await query(expensesQuery, [month, year]);

    // Expense summary by category
    const summaryQuery = `
      SELECT 
        kategori,
        SUM(jumlah) as total,
        COUNT(*) as jumlah_transaksi
      FROM expenses
      WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
      GROUP BY kategori
      ORDER BY total DESC
    `;
    
    const summary: any = await query(summaryQuery, [month, year]);

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        summary,
        total: expenses.reduce((sum: number, item: any) => sum + item.jumlah, 0)
      }
    });

  } catch (error: any) {
    console.error('Expenses error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { kategori, deskripsi, jumlah, tanggal, created_by } = await request.json();

    if (!kategori || !jumlah || !tanggal) {
      return NextResponse.json(
        { success: false, error: 'Kategori, jumlah, dan tanggal diperlukan' },
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO expenses (kategori, deskripsi, jumlah, tanggal, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result: any = await query(insertQuery, [kategori, deskripsi, jumlah, tanggal, created_by]);

    // Log the action
    await query(
      `INSERT INTO audit_log (user_id, action, description) VALUES (?, 'expense_create', ?)`,
      [created_by, `Menambah pengeluaran: ${kategori} - Rp ${jumlah}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Pengeluaran berhasil ditambahkan',
      data: { id: result.insertId }
    });

  } catch (error: any) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}