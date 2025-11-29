import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  getDocs, 
  addDoc,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

export async function GET() {
  try {
    console.log('📊 Loading expenses data...');
    
    const expensesSnapshot = await getDocs(
      query(collection(db, 'expenses'), orderBy('date', 'desc'))
    );

    const expenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${expenses.length} expenses`);

    // Calculate summary
    const total = expenses.reduce((sum, expense) => sum + (expense.jumlah || 0), 0);
    
    const byCategory = expenses.reduce((acc, expense) => {
      const category = expense.kategori || 'Lainnya';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }
      acc[category].total += expense.jumlah || 0;
      acc[category].count += 1;
      return acc;
    }, {});

    const summary = Object.entries(byCategory)
      .map(([kategori, data]) => ({
        kategori,
        total: data.total,
        jumlah_transaksi: data.count
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        total,
        summary,
        count: expenses.length
      }
    });

  } catch (error) {
    console.error('❌ Error loading expenses:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        expenses: [],
        total: 0,
        summary: [],
        count: 0
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { kategori, deskripsi, jumlah, tanggal, created_by } = await request.json();

    console.log('➕ Adding new expense:', { kategori, deskripsi, jumlah, tanggal });

    if (!kategori || !jumlah || !tanggal) {
      return NextResponse.json({
        success: false,
        error: 'Kategori, jumlah, dan tanggal diperlukan'
      }, { status: 400 });
    }

    const expenseData = {
      kategori,
      deskripsi: deskripsi || '',
      jumlah: parseFloat(jumlah),
      tanggal: new Date(tanggal),
      date: serverTimestamp(),
      created_by: created_by || 'system',
      created_at: serverTimestamp(),
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'expenses'), expenseData);

    console.log('✅ Expense added successfully:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Pengeluaran berhasil ditambahkan',
      expenseId: docRef.id
    });

  } catch (error) {
    console.error('❌ Error adding expense:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}