import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Helper to safely convert timestamp to ISO string
function formatDate(dateField) {
  if (!dateField) return null;

  // If it's a Firestore Timestamp
  if (dateField?.toDate) {
    return dateField.toDate().toISOString();
  }

  // If it's already a Date or string
  if (dateField instanceof Date) {
    return dateField.toISOString();
  }

  // Try to parse as date string
  try {
    return new Date(dateField).toISOString();
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const minimal = searchParams.get('minimal') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    const dataLimit = parseInt(searchParams.get('limit')) || (minimal ? 5 : 50);

    console.log(`📊 Loading expenses:`, { minimal, countOnly, limit: dataLimit });

    // Query all expenses
    const expensesSnapshot = await getDocs(collection(db, 'expenses'));

    // Map Firebase fields correctly - supports both naming conventions
    const expenses = expensesSnapshot.docs.map(doc => {
      const data = doc.data();

      // Get amount - try 'amount' first, then 'jumlah'
      const amount = data.amount || data.jumlah || 0;

      // Get category - try 'category' first, then 'kategori'
      const category = data.category || data.kategori || 'Lainnya';

      // Get description - try 'description' first, then 'deskripsi'
      const description = data.description || data.deskripsi || '';

      // Get date - try 'date' first, then 'tanggal', then 'createdAt'
      const dateField = data.date || data.tanggal || data.createdAt;

      return {
        id: doc.id,
        // Original field names (for backward compatibility)
        jumlah: amount,
        kategori: category,
        deskripsi: description,
        tanggal: formatDate(dateField),
        // New field names (from Firebase)
        amount: amount,
        category: category,
        description: description,
        date: formatDate(dateField),
        // Additional fields
        notes: data.notes || '',
        paymentMethod: data.paymentMethod || data.metode_pembayaran || '',
        status: data.status || 'active',
        createdBy: data.created_by || data.createdBy || 'System'
      };
    });

    // Sort by date descending
    expenses.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply limit
    const limitedExpenses = expenses.slice(0, dataLimit);

    console.log(`✅ Found ${limitedExpenses.length} expenses`);

    // Calculate summary
    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const byCategory = expenses.reduce((acc, expense) => {
      const cat = expense.category || 'Lainnya';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0 };
      }
      acc[cat].total += expense.amount || 0;
      acc[cat].count += 1;
      return acc;
    }, {});

    const summary = Object.entries(byCategory)
      .map(([kategori, data]) => ({
        kategori,
        category: kategori,
        total: data.total,
        jumlah_transaksi: data.count,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    if (minimal) {
      return NextResponse.json({
        success: true,
        data: {
          recentExpenses: limitedExpenses,
          totalToday: total,
          count: limitedExpenses.length,
          average: limitedExpenses.length > 0 ? total / limitedExpenses.length : 0
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=30'
        }
      });
    }

    if (countOnly) {
      return NextResponse.json({
        success: true,
        data: {
          count: expenses.length,
          estimatedTotal: total
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=60'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        expenses: limitedExpenses,
        total,
        summary,
        count: limitedExpenses.length,
        average: limitedExpenses.length > 0 ? total / limitedExpenses.length : 0
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60'
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
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Support both field naming conventions
    const category = body.category || body.kategori;
    const description = body.description || body.deskripsi || '';
    const amount = body.amount || body.jumlah;
    const date = body.date || body.tanggal;
    const createdBy = body.createdBy || body.created_by || 'system';

    console.log('➕ Adding new expense:', { category, description, amount, date });

    if (!category || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Category dan amount diperlukan'
      }, { status: 400 });
    }

    const expenseData = {
      // Store in both formats for compatibility
      category,
      kategori: category,
      description,
      deskripsi: description,
      amount: parseFloat(amount),
      jumlah: parseFloat(amount),
      date: date ? Timestamp.fromDate(new Date(date)) : serverTimestamp(),
      tanggal: date ? new Date(date) : new Date(),
      createdAt: serverTimestamp(),
      created_at: serverTimestamp(),
      createdBy,
      created_by: createdBy,
      status: 'completed'
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