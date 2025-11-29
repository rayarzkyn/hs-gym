import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    
    console.log('📊 Generating financial reports for period:', period);

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    console.log('📅 Date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // Get data from correct collections
    const [
      membersSnapshot,
      nonMembersSnapshot,
      expensesSnapshot,
      nonMemberTransactionsSnapshot
    ] = await Promise.all([
      // Members data - untuk menghitung pendapatan dari membership_price
      getDocs(collection(db, 'members')),
      
      // Non-members data (active daily passes) - untuk menghitung pendapatan dari harga
      getDocs(query(
        collection(db, 'non_members'),
        where('status', '==', 'active')
      )),
      
      // Expenses data
      getDocs(collection(db, 'expenses')),
      
      // Non-member transactions data - untuk pendapatan daily pass yang sudah completed
      getDocs(query(
        collection(db, 'non_member_transactions'),
        where('status', '==', 'completed')
      ))
    ]);

    console.log('📦 Data fetched:', {
      members: membersSnapshot.size,
      nonMembers: nonMembersSnapshot.size,
      expenses: expensesSnapshot.size,
      nonMemberTransactions: nonMemberTransactionsSnapshot.size
    });

    // Process members data
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const activeMembers = members.filter(m => m.status === 'active');
    const pendingMembers = members.filter(m => m.status === 'pending');

    // Process non-members data
    const nonMembers = nonMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Process expenses data with client-side date filtering
    const allExpenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const expenses = allExpenses.filter(expense => {
      const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
      return expenseDate >= startDate && expenseDate < endDate;
    });

    const totalExpenses = expenses.reduce((sum, expense) => {
      const amount = expense.amount || expense.jumlah || 0;
      return sum + amount;
    }, 0);

    // Process non-member transactions data
    const allNonMemberTransactions = nonMemberTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('🎫 Non-member transactions sample:', allNonMemberTransactions.slice(0, 2));

    // Filter non-member transactions by date
    const nonMemberTransactions = allNonMemberTransactions.filter(transaction => {
      const transactionDate = transaction.tanggal?.toDate?.() || 
                            transaction.created_at?.toDate?.() || 
                            new Date(transaction.timestamp);
      return transactionDate >= startDate && transactionDate < endDate;
    });

    console.log('📊 Filtered non-member transactions:', nonMemberTransactions.length);

    // CALCULATE REVENUE FROM DIFFERENT SOURCES

    // 1. Revenue from active members (membership_price)
    const membershipRevenue = activeMembers.reduce((sum, member) => {
      const amount = member.membership_price || 0;
      return sum + amount;
    }, 0);

    console.log('💳 Membership revenue from active members:', membershipRevenue);

    // 2. Revenue from non-members (harga field in non_members collection)
    const dailyPassRevenueFromActive = nonMembers.reduce((sum, nonMember) => {
      const amount = nonMember.harga || 0;
      return sum + amount;
    }, 0);

    console.log('🎫 Daily pass revenue from active non-members:', dailyPassRevenueFromActive);

    // 3. Revenue from completed non-member transactions (jumlah field)
    const dailyPassRevenueFromTransactions = nonMemberTransactions.reduce((sum, transaction) => {
      const amount = transaction.jumlah || 0;
      return sum + amount;
    }, 0);

    console.log('💰 Daily pass revenue from transactions:', dailyPassRevenueFromTransactions);

    // Total revenue calculation
    const totalRevenue = membershipRevenue + dailyPassRevenueFromTransactions;
    const totalDailyPassRevenue = dailyPassRevenueFromTransactions;

    console.log('💰 Total revenue breakdown:', {
      membershipRevenue,
      dailyPassRevenue: totalDailyPassRevenue,
      totalRevenue
    });

    // Generate revenue chart data
    const revenueData = generateRevenueChartData(members, nonMemberTransactions);

    const financialReport = {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        activeMembers: activeMembers.length,
        pendingMembers: pendingMembers.length,
        activeNonMembers: nonMembers.length,
        totalTransactions: nonMemberTransactions.length,
        memberTransactions: activeMembers.length, // Each active member represents a transaction
        nonMemberTransactions: nonMemberTransactions.length
      },
      revenue: {
        total: totalRevenue,
        membership: membershipRevenue,
        dailyPass: totalDailyPassRevenue,
        other: 0
      },
      transactions: {
        total: nonMemberTransactions.length + activeMembers.length,
        membership: activeMembers.length,
        dailyPass: nonMemberTransactions.length,
        date: new Date().toISOString()
      },
      chartData: revenueData,
      expenses: {
        total: totalExpenses,
        items: expenses.slice(0, 10)
      },
      members: {
        active: activeMembers.length,
        pending: pendingMembers.length,
        total: members.length
      },
      debug: {
        membershipRevenue,
        dailyPassRevenueFromActive,
        dailyPassRevenueFromTransactions,
        totalRevenue,
        activeMembersCount: activeMembers.length,
        nonMemberTransactionsCount: nonMemberTransactions.length,
        sampleMembers: activeMembers.slice(0, 2).map(m => ({
          id: m.id,
          membership_price: m.membership_price,
          status: m.status
        })),
        sampleNonMemberTransactions: nonMemberTransactions.slice(0, 2).map(t => ({
          id: t.id,
          jumlah: t.jumlah,
          status: t.status
        }))
      },
      period: {
        type: period,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Financial report generated successfully', {
      revenue: totalRevenue,
      expenses: totalExpenses,
      activeMembers: activeMembers.length,
      nonMemberTransactions: nonMemberTransactions.length
    });

    return NextResponse.json({
      success: true,
      data: financialReport
    });

  } catch (error) {
    console.error('❌ Error generating financial reports:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
}

// Helper function to generate revenue chart data
function generateRevenueChartData(members, nonMemberTransactions) {
  try {
    // Create data for last 30 days
    const chartData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Calculate membership revenue for this date (distribute active members' payments)
      const dailyMembershipRevenue = members.reduce((sum, member) => {
        // Simple distribution: divide annual membership by 365 days
        if (member.status === 'active') {
          const memberRevenue = (member.membership_price || 0) / 365;
          return sum + memberRevenue;
        }
        return sum;
      }, 0);
      
      // Calculate daily pass revenue for this date from transactions
      const dailyPassRevenue = nonMemberTransactions.reduce((sum, transaction) => {
        const transactionDate = transaction.tanggal?.toDate?.() || 
                              transaction.created_at?.toDate?.() || 
                              new Date(transaction.timestamp);
        const transactionDateKey = transactionDate.toISOString().split('T')[0];
        
        if (transactionDateKey === dateKey) {
          return sum + (transaction.jumlah || 0);
        }
        return sum;
      }, 0);
      
      chartData.push({
        date: dateKey,
        revenue: Math.round(dailyMembershipRevenue + dailyPassRevenue),
        membership: Math.round(dailyMembershipRevenue),
        dailyPass: Math.round(dailyPassRevenue),
        transactions: nonMemberTransactions.filter(transaction => {
          const transactionDate = transaction.tanggal?.toDate?.() || 
                                transaction.created_at?.toDate?.() || 
                                new Date(transaction.timestamp);
          const transactionDateKey = transactionDate.toISOString().split('T')[0];
          return transactionDateKey === dateKey;
        }).length
      });
    }

    console.log('📈 Generated chart data with', chartData.length, 'days');

    return chartData;
  } catch (error) {
    console.error('Error generating chart data:', error);
    return [];
  }
}