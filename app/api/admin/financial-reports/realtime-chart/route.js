```javascript
// api/admin/financial-reports/realtime-chart/route.js
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const type = searchParams.get('type') || 'revenue'; // 'revenue' or 'transactions'
    
    console.log(`📈 REAL - TIME CHART API: ${ days } days, type: ${ type } `);
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Days parameter must be between 1 and 365'
      }), { status: 400 });
    }
    
    const chartData = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Generate date ranges for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      chartData.unshift({
        date: startOfDay,
        startTimestamp: Timestamp.fromDate(startOfDay),
        endTimestamp: Timestamp.fromDate(endOfDay),
        formattedDate: startOfDay.toISOString().split('T')[0],
        day: startOfDay.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateLabel: startOfDay.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'short' 
        }),
        membership: 0,
        dailyPass: 0,
        total: 0,
        memberTransactions: 0,
        nonMemberTransactions: 0,
        totalTransactions: 0,
        expenses: 0,
        netIncome: 0
      });
    }
    
    // Get transactions for all days in single queries (more efficient)
    const startDate = chartData[0].date;
    const endDate = chartData[chartData.length - 1].endTimestamp;
    
    console.log('📅 Chart date range:', {
      start: startDate.toLocaleDateString('id-ID'),
      end: chartData[chartData.length - 1].date.toLocaleDateString('id-ID'),
      days: chartData.length
    });
    
    // Query for member transactions in the date range
    const memberTransactionsQuery = query(
      collection(db, "transactions"),
      where("tanggal", ">=", Timestamp.fromDate(startDate)),
      where("tanggal", "<=", endDate),
      where("status", "==", "completed"),
      orderBy("tanggal", "asc")
    );
    
    // Query for non-member transactions
    const nonMemberQuery = query(
      collection(db, "non_member_transactions"),
      where("tanggal", ">=", Timestamp.fromDate(startDate)),
      where("tanggal", "<=", endDate),
      where("status", "==", "completed"),
      orderBy("tanggal", "asc")
    );
    
    // Query for expenses
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", endDate),
      where("status", "==", "completed"),
      orderBy("date", "asc")
    );
    
    console.log('🚀 Fetching chart data...');
    
    const [
      memberTransactionsSnap,
      nonMemberSnap,
      expensesSnap
    ] = await Promise.all([
      getDocs(memberTransactionsQuery),
      getDocs(nonMemberQuery),
      getDocs(expensesQuery)
    ]);
    
    console.log('✅ Chart data fetched:', {
      memberTransactions: memberTransactionsSnap.docs.length,
      nonMemberTransactions: nonMemberSnap.docs.length,
      expenses: expensesSnap.docs.length
    });
    
    // Process member transactions
    memberTransactionsSnap.docs.forEach(doc => {
      const data = doc.data();
      const transactionDate = data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal);
      const dateStr = transactionDate.toISOString().split('T')[0];
      
      const dayData = chartData.find(d => d.formattedDate === dateStr);
      if (dayData) {
        dayData.membership += data.jumlah || 0;
        dayData.total += data.jumlah || 0;
        dayData.memberTransactions += 1;
        dayData.totalTransactions += 1;
      }
    });
    
    // Process non-member transactions
    nonMemberSnap.docs.forEach(doc => {
      const data = doc.data();
      const transactionDate = data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal);
      const dateStr = transactionDate.toISOString().split('T')[0];
      
      const dayData = chartData.find(d => d.formattedDate === dateStr);
      if (dayData) {
        dayData.dailyPass += data.jumlah || 0;
        dayData.total += data.jumlah || 0;
        dayData.nonMemberTransactions += 1;
        dayData.totalTransactions += 1;
      }
    });
    
    // Process expenses
    expensesSnap.docs.forEach(doc => {
      const data = doc.data();
      const expenseDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      const dateStr = expenseDate.toISOString().split('T')[0];
      
      const dayData = chartData.find(d => d.formattedDate === dateStr);
      if (dayData) {
        dayData.expenses += data.amount || 0;
        dayData.netIncome = dayData.total - (data.amount || 0);
      }
    });
    
    // Calculate net income for days without expenses
    chartData.forEach(day => {
      if (day.netIncome === 0) {
        day.netIncome = day.total - day.expenses;
      }
    });
    
    // Format data for response
    const formattedData = chartData.map(day => ({
      date: day.formattedDate,
      day: day.day,
      dateLabel: day.dateLabel,
      membership: day.membership,
      dailyPass: day.dailyPass,
      total: day.total,
      memberTransactions: day.memberTransactions,
      nonMemberTransactions: day.nonMemberTransactions,
      totalTransactions: day.totalTransactions,
      expenses: day.expenses,
      netIncome: day.netIncome,
      // For chart display
      [type === 'revenue' ? 'value' : 'transactions']: type === 'revenue' ? day.total : day.totalTransactions
    }));
    
    // Calculate summary stats
    const summary = {
      totalRevenue: formattedData.reduce((sum, day) => sum + day.total, 0),
      totalTransactions: formattedData.reduce((sum, day) => sum + day.totalTransactions, 0),
      avgDailyRevenue: formattedData.reduce((sum, day) => sum + day.total, 0) / days,
      avgDailyTransactions: formattedData.reduce((sum, day) => sum + day.totalTransactions, 0) / days,
      highestRevenueDay: formattedData.reduce((max, day) => day.total > max.total ? day : max, formattedData[0]),
      lowestRevenueDay: formattedData.reduce((min, day) => day.total < min.total ? day : min, formattedData[0]),
      totalExpenses: formattedData.reduce((sum, day) => sum + day.expenses, 0),
      totalNetIncome: formattedData.reduce((sum, day) => sum + day.netIncome, 0)
    };
    
    console.log('📊 Chart summary:', {
      totalRevenue: summary.totalRevenue.toLocaleString('id-ID'),
      totalTransactions: summary.totalTransactions,
      days: days
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: formattedData,
      summary,
      metadata: {
        days,
        type,
        isRealTime: true,
        lastUpdated: new Date().toISOString(),
        dataPoints: formattedData.length,
        dateRange: {
          start: formattedData[0]?.date,
          end: formattedData[formattedData.length - 1]?.date
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'X-Data-Source': 'firestore-realtime'
      }
    });
    
  } catch (error) {
    console.error('❌ REAL-TIME CHART Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: [],
      metadata: {
        isRealTime: false,
        error: true,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function HEAD(request) {
  return new Response(null, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}