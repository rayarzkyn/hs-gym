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

    let exportData = [];
    let filename = '';

    switch (type) {
      case 'transactions':
        exportData = await exportTransactions(start, end);
        filename = `transaksi_${startDate}_to_${endDate}.${format === 'excel' ? 'csv' : 'pdf'}`;
        break;

      case 'members':
        exportData = await exportMembers();
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
      filename: filename
    });

    return NextResponse.json({
      success: true,
      data: {
        data: exportData,
        filename: filename,
        recordCount: exportData.length,
        generatedAt: new Date().toISOString()
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

// Export transactions data
async function exportTransactions(startDate, endDate) {
  try {
    console.log('💳 Exporting transactions...');
    
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Include end date

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
      return transactionDate >= startDate && transactionDate < end;
    });

    // Format for export
    const formattedData = allTransactions.map(transaction => {
      const date = getTransactionDate(transaction);
      const amount = transaction.amount || transaction.jumlah || transaction.membership_price || 0;
      const method = transaction.paymentMethod || transaction.metode_pembayaran || 'unknown';
      
      return {
        'ID Transaksi': transaction.id,
        'Tanggal': date.toLocaleDateString('id-ID'),
        'Jenis': transaction.type === 'membership' ? 'Membership' : 'Daily Pass',
        'Nama': transaction.memberName || transaction.nama || 'Unknown',
        'Jumlah': amount,
        'Metode Pembayaran': method,
        'Status': transaction.status || 'completed',
        'Keterangan': transaction.description || ''
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting transactions:', error);
    return [];
  }
}

// Export members data
async function exportMembers() {
  try {
    console.log('👥 Exporting members data...');
    
    const membersSnapshot = await getDocs(collection(db, 'members'));
    
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const formattedData = members.map(member => {
      const joinDate = member.tanggal_daftar?.toDate?.() || new Date(member.tanggal_daftar);
      const expiryDate = member.masa_aktif?.toDate?.() || new Date(member.masa_aktif);
      
      return {
        'ID Member': member.id,
        'Nomor Member': member.nomor_member || '',
        'Nama Lengkap': member.nama || member.fullName || '',
        'Email': member.email || '',
        'Telepon': member.telepon || '',
        'Alamat': member.alamat || '',
        'Plan Membership': member.membership_plan || '',
        'Harga': member.membership_price || 0,
        'Status': member.status || '',
        'Tanggal Daftar': joinDate.toLocaleDateString('id-ID'),
        'Masa Aktif': expiryDate.toLocaleDateString('id-ID'),
        'Total Kunjungan': member.totalVisits || 0
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Error exporting members:', error);
    return [];
  }
}

// Export financial reports
async function exportFinancialReports(startDate, endDate) {
  try {
    console.log('📊 Exporting financial reports...');
    
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    // Get data from multiple sources
    const [
      membersSnapshot,
      nonMembersSnapshot,
      expensesSnapshot,
      nonMemberTransactionsSnapshot
    ] = await Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(query(collection(db, 'non_members'), where('status', '==', 'active'))),
      getDocs(collection(db, 'expenses')),
      getDocs(query(collection(db, 'non_member_transactions'), where('status', '==', 'completed')))
    ]);

    // Process data
    const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nonMembers = nonMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nonMemberTransactions = nonMemberTransactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by date
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
      return expenseDate >= startDate && expenseDate < end;
    });

    const filteredNonMemberTransactions = nonMemberTransactions.filter(transaction => {
      const transactionDate = getTransactionDate(transaction);
      return transactionDate >= startDate && transactionDate < end;
    });

    // Calculate totals
    const activeMembers = members.filter(m => m.status === 'active');
    const membershipRevenue = activeMembers.reduce((sum, member) => sum + (member.membership_price || 0), 0);
    const dailyPassRevenue = filteredNonMemberTransactions.reduce((sum, transaction) => sum + (transaction.jumlah || 0), 0);
    const totalRevenue = membershipRevenue + dailyPassRevenue;
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.jumlah || 0), 0);

    const formattedData = [{
      'Periode': `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`,
      'Total Pendapatan': totalRevenue,
      'Pendapatan Membership': membershipRevenue,
      'Pendapatan Daily Pass': dailyPassRevenue,
      'Total Pengeluaran': totalExpenses,
      'Laba Bersih': totalRevenue - totalExpenses,
      'Member Aktif': activeMembers.length,
      'Member Total': members.length,
      'Daily Pass Aktif': nonMembers.length,
      'Transaksi Daily Pass': filteredNonMemberTransactions.length,
      'Jumlah Pengeluaran': filteredExpenses.length
    }];

    return formattedData;
  } catch (error) {
    console.error('Error exporting financial reports:', error);
    return [];
  }
}

// Export expenses data
async function exportExpenses(startDate, endDate) {
  try {
    console.log('💸 Exporting expenses data...');
    
    const expensesSnapshot = await getDocs(
      query(collection(db, 'expenses'), orderBy('date', 'desc'))
    );

    const allExpenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    // Filter by date
    const filteredExpenses = allExpenses.filter(expense => {
      const expenseDate = expense.date?.toDate?.() || new Date(expense.date);
      return expenseDate >= startDate && expenseDate < end;
    });

    const formattedData = filteredExpenses.map(expense => {
      const date = expense.date?.toDate?.() || new Date(expense.date);
      
      return {
        'ID Pengeluaran': expense.id,
        'Tanggal': date.toLocaleDateString('id-ID'),
        'Kategori': expense.kategori || 'Lainnya',
        'Deskripsi': expense.deskripsi || '',
        'Jumlah': expense.jumlah || 0,
        'Dibuat Oleh': expense.created_by || 'System',
        'Status': expense.status || 'active'
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