import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  getDocs, 
  query,
  where,
  orderBy
} from 'firebase/firestore';

export async function POST(request) {
  try {
    const { type, startDate, endDate, format = 'excel' } = await request.json();

    console.log('📤 Export request:', { type, startDate, endDate, format });

    if (!type || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Type, startDate, dan endDate diperlukan'
      }, { status: 400 });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return NextResponse.json({
        success: false,
        error: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir'
      }, { status: 400 });
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    let exportData = [];
    let filename = '';

    switch (type) {
      case 'transactions':
        exportData = await exportTransactions(start, end);
        filename = `transaksi_${startDate}_to_${endDate}.${format === 'excel' ? 'csv' : 'pdf'}`;
        break;

      case 'members':
        exportData = await exportMembers(start, end); // Pass dates for member join date filtering
        filename = `data_member_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'csv' : 'pdf'}`;
        break;

      case 'financial':
        exportData = await exportFinancialReports(start, end);
        filename = `laporan_keuangan_${startDate}_to_${endDate}.${format === 'excel' ? 'csv' : 'pdf'}`;
        break;

      case 'expenses':
        exportData = await exportExpenses(start, end);
        filename = `laporan_pengeluaran_${startDate}_to_${endDate}.${format === 'excel' ? 'csv' : 'pdf'}`;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Jenis export tidak valid'
        }, { status: 400 });
    }

    console.log(`✅ Export ${type} successful:`, {
      recordCount: exportData.length,
      filename: filename,
      dateRange: `${startDate} to ${endDate}`
    });

    return NextResponse.json({
      success: true,
      data: {
        data: exportData,
        filename: filename,
        recordCount: exportData.length,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
}

// Export transactions data with proper date filtering
async function exportTransactions(startDate, endDate) {
  try {
    console.log('💳 Exporting transactions...', {
      start: startDate.toLocaleDateString('id-ID'),
      end: endDate.toLocaleDateString('id-ID')
    });
    
    // Get member transactions
    const memberTransactionsSnapshot = await getDocs(
      query(collection(db, 'transactions'))
    );

    // Get non-member transactions
    const nonMemberTransactionsSnapshot = await getDocs(
      query(
        collection(db, 'non_member_transactions'),
        where('status', '==', 'completed')
      )
    );

    const allMemberTransactions = memberTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'membership'
    }));

    const allNonMemberTransactions = nonMemberTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'daily_pass'
    }));

    // Combine and filter by date
    const allTransactions = [
      ...allMemberTransactions,
      ...allNonMemberTransactions
    ].filter(transaction => {
      const transactionDate = getTransactionDate(transaction);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    console.log(`📊 Found ${allTransactions.length} transactions in date range`);

    // Format for export
    const formattedData = allTransactions.map(transaction => {
      const date = getTransactionDate(transaction);
      const amount = transaction.amount || transaction.jumlah || transaction.membership_price || 0;
      const method = transaction.paymentMethod || transaction.metode_pembayaran || 'unknown';
      
      return {
        'ID Transaksi': transaction.id,
        'Tanggal': date.toLocaleDateString('id-ID'),
        'Waktu': date.toLocaleTimeString('id-ID'),
        'Jenis': transaction.type === 'membership' ? 'Membership' : 'Daily Pass',
        'Nama': transaction.memberName || transaction.nama || transaction.fullName || 'Unknown',
        'Jumlah': `Rp ${amount.toLocaleString('id-ID')}`,
        'Nominal': amount,
        'Metode Pembayaran': method,
        'Status': transaction.status || 'completed',
        'Keterangan': transaction.description || transaction.keterangan || ''
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting transactions:', error);
    return [];
  }
}

// Export members data - filter by join date if needed
async function exportMembers(startDate, endDate) {
  try {
    console.log('👥 Exporting members data...');
    
    const membersSnapshot = await getDocs(collection(db, 'members'));
    
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter members by join date within range (if needed)
    const filteredMembers = members.filter(member => {
      const joinDate = member.tanggal_daftar?.toDate?.() || new Date(member.tanggal_daftar);
      return joinDate >= startDate && joinDate <= endDate;
    });

    console.log(`👥 Found ${filteredMembers.length} members in date range`);

    const formattedData = filteredMembers.map(member => {
      const joinDate = member.tanggal_daftar?.toDate?.() || new Date(member.tanggal_daftar);
      const expiryDate = member.masa_aktif?.toDate?.() || new Date(member.masa_aktif);
      
      return {
        'ID Member': member.id,
        'Nomor Member': member.nomor_member || '',
        'Nama Lengkap': member.nama || member.fullName || '',
        'Email': member.email || '',
        'Telepon': member.telepon || member.phone || '',
        'Alamat': member.alamat || member.address || '',
        'Plan Membership': member.membership_plan || member.plan || '',
        'Harga': `Rp ${(member.membership_price || 0).toLocaleString('id-ID')}`,
        'Nominal': member.membership_price || 0,
        'Status': member.status || '',
        'Tanggal Daftar': joinDate.toLocaleDateString('id-ID'),
        'Masa Aktif': expiryDate.toLocaleDateString('id-ID'),
        'Sisa Hari': Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))),
        'Total Kunjungan': member.totalVisits || member.kunjungan || 0,
        'Terakhir Kunjung': member.lastVisit ? new Date(member.lastVisit).toLocaleDateString('id-ID') : '-'
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting members:', error);
    return [];
  }
}

// Export financial reports with proper date filtering
async function exportFinancialReports(startDate, endDate) {
  try {
    console.log('📊 Exporting financial reports...', {
      start: startDate.toLocaleDateString('id-ID'),
      end: endDate.toLocaleDateString('id-ID')
    });
    
    // Get data from multiple sources
    const [
      membersSnapshot,
      nonMembersSnapshot,
      expensesSnapshot,
      nonMemberTransactionsSnapshot,
      memberTransactionsSnapshot
    ] = await Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(query(collection(db, 'non_members'), where('status', '==', 'active'))),
      getDocs(collection(db, 'expenses')),
      getDocs(query(collection(db, 'non_member_transactions'), where('status', '==', 'completed'))),
      getDocs(collection(db, 'transactions'))
    ]);

    // Process data
    const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nonMembers = nonMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nonMemberTransactions = nonMemberTransactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const memberTransactions = memberTransactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by date
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    const filteredNonMemberTransactions = nonMemberTransactions.filter(transaction => {
      const transactionDate = getTransactionDate(transaction);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    const filteredMemberTransactions = memberTransactions.filter(transaction => {
      const transactionDate = getTransactionDate(transaction);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Calculate totals
    const activeMembers = members.filter(m => m.status === 'active');
    const membershipRevenue = filteredMemberTransactions.reduce((sum, transaction) => 
      sum + (transaction.amount || transaction.membership_price || 0), 0);
    const dailyPassRevenue = filteredNonMemberTransactions.reduce((sum, transaction) => 
      sum + (transaction.jumlah || transaction.amount || 0), 0);
    const totalRevenue = membershipRevenue + dailyPassRevenue;
    const totalExpenses = filteredExpenses.reduce((sum, expense) => 
      sum + (expense.jumlah || expense.amount || 0), 0);

    const formattedData = [{
      'Periode': `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`,
      'Total Pendapatan': `Rp ${totalRevenue.toLocaleString('id-ID')}`,
      'Pendapatan Membership': `Rp ${membershipRevenue.toLocaleString('id-ID')}`,
      'Pendapatan Daily Pass': `Rp ${dailyPassRevenue.toLocaleString('id-ID')}`,
      'Total Pengeluaran': `Rp ${totalExpenses.toLocaleString('id-ID')}`,
      'Laba Bersih': `Rp ${(totalRevenue - totalExpenses).toLocaleString('id-ID')}`,
      'Member Aktif': activeMembers.length,
      'Member Total': members.length,
      'Daily Pass Aktif': nonMembers.length,
      'Transaksi Daily Pass': filteredNonMemberTransactions.length,
      'Transaksi Membership': filteredMemberTransactions.length,
      'Jumlah Pengeluaran': filteredExpenses.length,
      'Tanggal Export': new Date().toLocaleDateString('id-ID')
    }];

    console.log(`📊 Financial report generated:`, {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netIncome: totalRevenue - totalExpenses
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting financial reports:', error);
    return [];
  }
}

// Export expenses data with proper date filtering
async function exportExpenses(startDate, endDate) {
  try {
    console.log('💸 Exporting expenses data...', {
      start: startDate.toLocaleDateString('id-ID'),
      end: endDate.toLocaleDateString('id-ID')
    });
    
    const expensesSnapshot = await getDocs(
      query(collection(db, 'expenses'), orderBy('date', 'desc'))
    );

    const allExpenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by date
    const filteredExpenses = allExpenses.filter(expense => {
      const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    console.log(`💸 Found ${filteredExpenses.length} expenses in date range`);

    const formattedData = filteredExpenses.map(expense => {
      const date = expense.date?.toDate?.() || new Date(expense.date);
      
      return {
        'ID Pengeluaran': expense.id,
        'Tanggal': date.toLocaleDateString('id-ID'),
        'Waktu': date.toLocaleTimeString('id-ID'),
        'Kategori': expense.kategori || expense.category || 'Lainnya',
        'Deskripsi': expense.deskripsi || expense.description || '',
        'Jumlah': `Rp ${(expense.jumlah || expense.amount || 0).toLocaleString('id-ID')}`,
        'Nominal': expense.jumlah || expense.amount || 0,
        'Dibuat Oleh': expense.created_by || expense.createdBy || 'System',
        'Status': expense.status || 'active',
        'Metode Pembayaran': expense.payment_method || expense.paymentMethod || 'Cash'
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting expenses:', error);
    return [];
  }
}

// Helper function to get transaction date from various field names
function getTransactionDate(transaction) {
  if (transaction.tanggal?.toDate) {
    return transaction.tanggal.toDate();
  }
  if (transaction.created_at?.toDate) {
    return transaction.created_at.toDate();
  }
  if (transaction.timestamp?.toDate) {
    return transaction.timestamp.toDate();
  }
  if (transaction.date?.toDate) {
    return transaction.date.toDate();
  }
  if (transaction.tanggal) {
    return new Date(transaction.tanggal);
  }
  if (transaction.created_at) {
    return new Date(transaction.created_at);
  }
  if (transaction.timestamp) {
    return new Date(transaction.timestamp);
  }
  if (transaction.date) {
    return new Date(transaction.date);
  }
  return new Date();
}