// File: app/api/admin/financial-reports/chart/route.js
// PERBAIKAN: Gunakan query sederhana tanpa composite index, tidak pakai random data
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';

export async function GET(request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 7;

    console.log(`📈 Generating REAL chart data for ${days} days from Firebase...`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);

    // ============================================
    // 1. GET ALL DATA WITH SIMPLE QUERIES (no composite index needed)
    // ============================================

    // Get all completed member transactions
    const memberTransactionsQuery = query(
      collection(db, 'transactions'),
      where('status', '==', 'completed')
    );

    // Get all completed non-member transactions
    const nonMemberTransactionsQuery = query(
      collection(db, 'non_member_transactions'),
      where('status', '==', 'completed')
    );

    // Get all expenses
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('status', '==', 'completed')
    );

    // Get all active members
    const membersQuery = query(collection(db, 'members'));

    console.log('🔄 Fetching all data from Firebase...');

    const [
      memberTransactionsSnap,
      nonMemberTransactionsSnap,
      expensesSnap,
      membersSnap
    ] = await Promise.all([
      getDocs(memberTransactionsQuery),
      getDocs(nonMemberTransactionsQuery),
      getDocs(expensesQuery),
      getDocs(membersQuery)
    ]);

    // Convert to arrays with proper date handling
    const memberTransactions = memberTransactionsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tanggal: data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal)
      };
    });

    const nonMemberTransactions = nonMemberTransactionsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tanggal: data.tanggal?.toDate ? data.tanggal.toDate() :
          data.created_at?.toDate ? data.created_at.toDate() : new Date()
      };
    });

    const allExpenses = expensesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() :
          data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.date || data.tanggal)
      };
    });

    const allMembers = membersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Fetched: ${memberTransactions.length} member tx, ${nonMemberTransactions.length} non-member tx, ${allExpenses.length} expenses, ${allMembers.length} members`);

    // ============================================
    // 2. BUILD CHART DATA BY FILTERING IN JAVASCRIPT
    // ============================================
    const chartData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Filter transactions for this day
      const dayMemberTx = memberTransactions.filter(tx => {
        if (!tx.tanggal) return false;
        return tx.tanggal >= dayStart && tx.tanggal < dayEnd;
      });

      const dayNonMemberTx = nonMemberTransactions.filter(tx => {
        if (!tx.tanggal) return false;
        return tx.tanggal >= dayStart && tx.tanggal < dayEnd;
      });

      const dayExpenses = allExpenses.filter(exp => {
        if (!exp.date) return false;
        return exp.date >= dayStart && exp.date < dayEnd;
      });

      // Calculate revenues from actual Firebase data
      const membershipRevenue = dayMemberTx.reduce((sum, tx) => sum + (tx.jumlah || 0), 0);
      const dailyPassRevenue = dayNonMemberTx.reduce((sum, tx) => sum + (tx.jumlah || 0), 0);
      const totalExpenses = dayExpenses.reduce((sum, exp) => sum + (exp.amount || exp.jumlah || 0), 0);

      const totalRevenue = membershipRevenue + dailyPassRevenue;
      const netProfit = totalRevenue - totalExpenses;

      chartData.push({
        date: dateKey,
        revenue: totalRevenue,
        transactions: dayMemberTx.length + dayNonMemberTx.length,
        membership: membershipRevenue,
        dailyPass: dailyPassRevenue,
        expenses: totalExpenses,
        profit: netProfit,
        memberTransactions: dayMemberTx.length,
        dailyPassTransactions: dayNonMemberTx.length,
        rawData: {
          memberTxCount: dayMemberTx.length,
          nonMemberTxCount: dayNonMemberTx.length,
          expenseCount: dayExpenses.length
        }
      });

      console.log(`  📅 ${dateKey}: Revenue=${totalRevenue}, MemberTx=${dayMemberTx.length}, NonMemberTx=${dayNonMemberTx.length}`);
    }

    // ============================================
    // 3. CALCULATE TOTALS
    // ============================================
    const totals = {
      totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
      totalMembership: chartData.reduce((sum, d) => sum + d.membership, 0),
      totalDailyPass: chartData.reduce((sum, d) => sum + d.dailyPass, 0),
      totalTransactions: chartData.reduce((sum, d) => sum + d.transactions, 0),
      totalExpenses: chartData.reduce((sum, d) => sum + d.expenses, 0),
      totalProfit: chartData.reduce((sum, d) => sum + d.profit, 0)
    };

    const responseTime = Date.now() - startTime;
    console.log(`✅ REAL chart data generated in ${responseTime}ms`);
    console.log('📊 Totals:', totals);

    return NextResponse.json({
      success: true,
      data: chartData,
      totals,
      responseTime: `${responseTime}ms`,
      days: days,
      source: 'firestore-real',
      dataInfo: {
        memberTransactionsTotal: memberTransactions.length,
        nonMemberTransactionsTotal: nonMemberTransactions.length,
        expensesTotal: allExpenses.length,
        membersTotal: allMembers.length
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60'
      }
    });

  } catch (error) {
    console.error('❌ Chart API error:', error);

    // Return empty data instead of random data
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
      totals: {
        totalRevenue: 0,
        totalMembership: 0,
        totalDailyPass: 0,
        totalTransactions: 0,
        totalExpenses: 0,
        totalProfit: 0
      }
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }
}