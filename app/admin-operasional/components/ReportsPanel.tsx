'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query
} from 'firebase/firestore';

interface ReportsPanelProps {
  onRefresh: () => void;
}

interface ReportData {
  period: string;
  dateRange: string;

  // Member Statistics
  activeMembers: number;
  expiredMembers: number;
  totalMembers: number;
  newMembersThisMonth: number;
  totalMembershipRevenue: number;
  thisMonthRevenue: number;

  // Non-Member Statistics
  totalNonMembers: number;
  activeNonMembers: number;
  todayNonMembers: number;
  nonMemberRevenueTotal: number;
  nonMemberRevenueToday: number;
  nonMemberRevenueThisMonth: number;

  // Visitor Statistics
  totalVisitors: number;
  memberVisitors: number;
  nonMemberVisitors: number;

  // Detailed Lists
  memberList: Array<{
    id: string;
    fullName: string;
    membershipPlan: string;
    membershipPrice: number;
    createdAt: Date;
    status: string;
    masaAktif: Date;
  }>;

  nonMemberList: Array<{
    id: string;
    dailyCode: string;
    nama: string;
    harga: number;
    createdAt: Date;
    expiredAt: Date;
    status: string;
    paymentMethod: string;
  }>;

  dailyNonMemberStats: Array<{
    date: string;
    count: number;
    revenue: number;
    details: Array<{
      dailyCode: string;
      nama: string;
      harga: number;
      paymentMethod: string;
    }>;
  }>;

  nonMemberTransactions: Array<{
    id: string;
    dailyCode: string;
    nama: string;
    jumlah: number;
    metodePembayaran: string;
    createdAt: Date;
    status: string;
  }>;
}

// Default report data
const defaultReportData: ReportData = {
  period: 'Harian',
  dateRange: new Date().toLocaleDateString('id-ID'),
  activeMembers: 0,
  expiredMembers: 0,
  totalMembers: 0,
  newMembersThisMonth: 0,
  totalMembershipRevenue: 0,
  thisMonthRevenue: 0,
  totalNonMembers: 0,
  activeNonMembers: 0,
  todayNonMembers: 0,
  nonMemberRevenueTotal: 0,
  nonMemberRevenueToday: 0,
  nonMemberRevenueThisMonth: 0,
  totalVisitors: 0,
  memberVisitors: 0,
  nonMemberVisitors: 0,
  memberList: [],
  nonMemberList: [],
  dailyNonMemberStats: [],
  nonMemberTransactions: []
};

export default function ReportsPanel({ onRefresh }: ReportsPanelProps) {
  const [selectedReport, setSelectedReport] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [reportData, setReportData] = useState<ReportData>(defaultReportData);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [membersData, setMembersData] = useState<any[]>([]);
  const [nonMembersData, setNonMembersData] = useState<any[]>([]);
  const [nonMemberTransactionsData, setNonMemberTransactionsData] = useState<any[]>([]);

  // 🔥 REAL-TIME DATA FETCHING - MEMBERS
  useEffect(() => {
    console.log('🔥 Setting up REAL-TIME listeners for members...');

    const membersQuery = query(collection(db, 'members'));
    const unsubscribeMembers = onSnapshot(membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fullName: data.fullName || data.nama || 'Unknown',
            membershipPrice: parseFloat(data.membership_price) || 0,
            membershipPlan: data.membership_plan || 'Unknown',
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || new Date()),
            tanggal_daftar: data.tanggal_daftar?.toDate?.() || new Date(data.tanggal_daftar || new Date()),
            masa_aktif: data.masa_aktif ? new Date(data.masa_aktif) : null,
            status: data.status || 'unknown'
          };
        });

        console.log('👥 Members updated:', members.length);
        setMembersData(members);
      },
      (error) => {
        console.error('Error listening to members:', error);
      }
    );

    // 🔥 REAL-TIME DATA FETCHING - NON-MEMBERS
    const nonMembersQuery = query(collection(db, 'non_members'));
    const unsubscribeNonMembers = onSnapshot(nonMembersQuery,
      (snapshot) => {
        const nonMembers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dailyCode: data.daily_code || data.id,
            nama: data.nama || 'Unknown',
            harga: parseFloat(data.harga) || 15000,
            createdAt: data.created_at?.toDate?.() || new Date(data.created_at || new Date()),
            expiredAt: data.expired_at?.toDate?.() || new Date(data.expired_at || new Date()),
            status: data.status || 'active',
            paymentMethod: data.payment_method || 'qris'
          };
        });

        console.log('🎫 Non-members updated:', nonMembers.length);
        setNonMembersData(nonMembers);
      },
      (error) => {
        console.error('Error listening to non-members:', error);
      }
    );

    // 🔥 REAL-TIME DATA FETCHING - NON-MEMBER TRANSACTIONS
    const nmTransactionsQuery = query(collection(db, 'non_member_transactions'));
    const unsubscribeNMTransactions = onSnapshot(nmTransactionsQuery,
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dailyCode: data.daily_code || '',
            nama: data.nama || 'Unknown',
            jumlah: parseFloat(data.jumlah) || 0,
            metodePembayaran: data.metode_pembayaran || 'qris',
            createdAt: data.created_at?.toDate?.() || new Date(data.created_at || new Date()),
            status: data.status || 'completed'
          };
        });

        console.log('💰 Non-member transactions updated:', transactions.length);
        setNonMemberTransactionsData(transactions);
      },
      (error) => {
        console.error('Error listening to non-member transactions:', error);
      }
    );

    return () => {
      unsubscribeMembers();
      unsubscribeNonMembers();
      unsubscribeNMTransactions();
    };
  }, []);

  // Hitung semua statistik saat data berubah
  useEffect(() => {
    if (membersData.length > 0 || nonMembersData.length > 0 || nonMemberTransactionsData.length > 0) {
      calculateAllStatistics();
    }
  }, [membersData, nonMembersData, nonMemberTransactionsData]);

  const calculateAllStatistics = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // === 1. MEMBER STATISTICS ===
    // Total revenue dari semua membership_price
    const totalMembershipRevenue = membersData.reduce((sum, member) => {
      return sum + (member.membershipPrice || 0);
    }, 0);

    // Member aktif (masa_aktif belum expired)
    const activeMembers = membersData.filter(member => {
      if (member.status !== 'active') return false;
      if (!member.masa_aktif) return false;
      return member.masa_aktif >= now;
    }).length;

    // Member expired
    const expiredMembers = membersData.filter(member => {
      if (member.status === 'expired') return true;
      if (member.masa_aktif) {
        return member.masa_aktif < now;
      }
      return false;
    }).length;

    // Member baru bulan ini
    const newMembersThisMonth = membersData.filter(member => {
      const joinDate = member.createdAt || member.tanggal_daftar;
      if (!joinDate) return false;

      const joinDateObj = joinDate instanceof Date ? joinDate : new Date(joinDate);
      return (
        joinDateObj.getMonth() === currentMonth &&
        joinDateObj.getFullYear() === currentYear
      );
    }).length;

    // Revenue dari member baru bulan ini
    const thisMonthRevenue = membersData
      .filter(member => {
        const joinDate = member.createdAt || member.tanggal_daftar;
        if (!joinDate) return false;

        const joinDateObj = joinDate instanceof Date ? joinDate : new Date(joinDate);
        return (
          joinDateObj.getMonth() === currentMonth &&
          joinDateObj.getFullYear() === currentYear
        );
      })
      .reduce((sum, member) => sum + (member.membershipPrice || 0), 0);

    // === 2. NON-MEMBER STATISTICS ===
    const totalNonMembers = nonMembersData.length;

    // Non-members yang masih aktif (belum expired)
    const activeNonMembers = nonMembersData.filter(nm => {
      if (nm.status !== 'active') return false;
      return nm.expiredAt >= now;
    }).length;

    // Non-members yang dibuat hari ini
    const todayNonMembers = nonMembersData.filter(nm => {
      const createDate = nm.createdAt;
      if (!createDate) return false;
      const createDateStr = createDate.toISOString().split('T')[0];
      return createDateStr === today;
    }).length;

    // Total revenue dari semua non-members (jumlahkan harga)
    const nonMemberRevenueTotal = nonMembersData.reduce((sum, nm) => {
      return sum + (nm.harga || 0);
    }, 0);

    // Revenue dari non-members hari ini
    const nonMemberRevenueToday = nonMembersData
      .filter(nm => {
        const createDate = nm.createdAt;
        if (!createDate) return false;
        const createDateStr = createDate.toISOString().split('T')[0];
        return createDateStr === today;
      })
      .reduce((sum, nm) => sum + (nm.harga || 0), 0);

    // Revenue dari non-members bulan ini
    const nonMemberRevenueThisMonth = nonMembersData
      .filter(nm => {
        const createDate = nm.createdAt;
        if (!createDate) return false;
        const createDateObj = createDate instanceof Date ? createDate : new Date(createDate);
        return (
          createDateObj.getMonth() === currentMonth &&
          createDateObj.getFullYear() === currentYear
        );
      })
      .reduce((sum, nm) => sum + (nm.harga || 0), 0);

    // === 3. TRANSACTION STATISTICS ===
    // Revenue dari transactions (jika ada data transaction terpisah)
    const transactionRevenue = nonMemberTransactionsData.reduce((sum, tx) => {
      return sum + (tx.jumlah || 0);
    }, 0);

    // === 4. DAILY NON-MEMBER STATISTICS ===
    const dailyStatsMap = new Map<string, { count: number, revenue: number, details: any[] }>();

    nonMembersData.forEach(nm => {
      if (!nm.createdAt) return;

      const dateStr = nm.createdAt.toISOString().split('T')[0];
      const current = dailyStatsMap.get(dateStr) || { count: 0, revenue: 0, details: [] };

      current.count += 1;
      current.revenue += nm.harga || 0;
      current.details.push({
        dailyCode: nm.dailyCode,
        nama: nm.nama,
        harga: nm.harga,
        paymentMethod: nm.paymentMethod
      });

      dailyStatsMap.set(dateStr, current);
    });

    const dailyNonMemberStats = Array.from(dailyStatsMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: data.revenue,
        details: data.details
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Urutkan dari terbaru

    // === 5. VISITOR STATISTICS ===
    // Ini bisa diisi dari visits data jika ada
    const totalVisitors = activeMembers + activeNonMembers;

    // Update report data
    setReportData({
      period: 'Harian',
      dateRange: now.toLocaleDateString('id-ID'),

      // Member Statistics
      activeMembers,
      expiredMembers,
      totalMembers: membersData.length,
      newMembersThisMonth,
      totalMembershipRevenue,
      thisMonthRevenue,

      // Non-Member Statistics
      totalNonMembers,
      activeNonMembers,
      todayNonMembers,
      nonMemberRevenueTotal: Math.max(nonMemberRevenueTotal, transactionRevenue),
      nonMemberRevenueToday,
      nonMemberRevenueThisMonth,

      // Visitor Statistics
      totalVisitors,
      memberVisitors: activeMembers,
      nonMemberVisitors: activeNonMembers,

      // Detailed Lists
      memberList: membersData.map(m => ({
        id: m.id,
        fullName: m.fullName,
        membershipPlan: m.membershipPlan,
        membershipPrice: m.membershipPrice,
        createdAt: m.createdAt,
        status: m.status,
        masaAktif: m.masa_aktif
      })),

      nonMemberList: nonMembersData.map(nm => ({
        id: nm.id,
        dailyCode: nm.dailyCode,
        nama: nm.nama,
        harga: nm.harga,
        createdAt: nm.createdAt,
        expiredAt: nm.expiredAt,
        status: nm.status,
        paymentMethod: nm.paymentMethod
      })),

      dailyNonMemberStats,

      nonMemberTransactions: nonMemberTransactionsData.map(tx => ({
        id: tx.id,
        dailyCode: tx.dailyCode,
        nama: tx.nama,
        jumlah: tx.jumlah,
        metodePembayaran: tx.metodePembayaran,
        createdAt: tx.createdAt,
        status: tx.status
      }))
    });

    setLoading(false);

    console.log('📊 All statistics calculated:', {
      members: membersData.length,
      nonMembers: nonMembersData.length,
      transactions: nonMemberTransactionsData.length,
      dailyStats: dailyNonMemberStats.length
    });
  };

  const generateDetailedReport = async () => {
    try {
      setLoading(true);

      // Calculate statistics dengan data terbaru
      calculateAllStatistics();

      const now = new Date();
      let periodLabel: string;
      let dateRange: string;

      switch (selectedReport) {
        case 'daily':
          periodLabel = 'Harian';
          dateRange = now.toLocaleDateString('id-ID');
          break;

        case 'weekly':
          periodLabel = 'Mingguan';
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          dateRange = `${weekStart.toLocaleDateString('id-ID')} - ${weekEnd.toLocaleDateString('id-ID')}`;
          break;

        case 'monthly':
          periodLabel = 'Bulanan';
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          dateRange = `${monthStart.toLocaleDateString('id-ID')} - ${monthEnd.toLocaleDateString('id-ID')}`;
          break;

        default: // custom
          periodLabel = 'Kustom';
          dateRange = 'Tanggal Kustom';
      }

      // Update report data dengan periode yang dipilih
      const updatedReport = {
        ...reportData,
        period: periodLabel,
        dateRange: dateRange
      };

      console.log('📊 Generated report:', updatedReport);
      setReportData(updatedReport);

    } catch (error) {
      console.error('Error generating detailed report:', error);
      alert('Terjadi kesalahan saat membuat laporan detail');
    } finally {
      setLoading(false);
    }
  };

  const exportToHTML = async () => {
    try {
      setExporting(true);

      // Buat konten HTML untuk laporan lengkap
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1 { color: #2c3e50; text-align: center; margin-bottom: 10px; }
            h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-top: 30px; }
            h3 { color: #2c3e50; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #3498db; color: white; padding: 10px; text-align: left; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; }
            .summary-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6; }
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
            .metric-value { font-size: 28px; font-weight: bold; margin: 10px 0; }
            .metric-label { font-size: 14px; color: #6c757d; }
            .revenue-highlight { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); padding: 20px; border-radius: 8px; margin: 20px 0; }
            .section { page-break-inside: avoid; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d; font-size: 12px; }
            .text-success { color: #28a745; }
            .text-primary { color: #007bff; }
            .text-warning { color: #ffc107; }
            .text-danger { color: #dc3545; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .badge-success { background-color: #d4edda; color: #155724; }
            .badge-danger { background-color: #f8d7da; color: #721c24; }
            .badge-warning { background-color: #fff3cd; color: #856404; }
          </style>
        </head>
        <body>
          <h1>LAPORAN OPERASIONAL HS GYM</h1>
          <p style="text-align: center; color: #6c757d;">
            <strong>Periode:</strong> ${reportData.period}<br>
            <strong>Tanggal:</strong> ${reportData.dateRange}<br>
            <strong>Dicetak:</strong> ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}
          </p>
          
          <!-- RINGKASAN UTAMA -->
          <div class="summary-box">
            <h2>📊 Ringkasan Utama</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${reportData.totalMembers}</div>
                <div class="metric-label">Total Member</div>
                <div style="font-size: 12px; margin-top: 5px;">
                  ${reportData.activeMembers} aktif • ${reportData.expiredMembers} expired
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">${reportData.totalNonMembers}</div>
                <div class="metric-label">Total Non-Member</div>
                <div style="font-size: 12px; margin-top: 5px;">
                  ${reportData.activeNonMembers} aktif • ${reportData.todayNonMembers} hari ini
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value text-success">${formatCurrency(reportData.totalMembershipRevenue)}</div>
                <div class="metric-label">Revenue Member</div>
                <div style="font-size: 12px; margin-top: 5px;">
                  ${reportData.newMembersThisMonth} baru bulan ini
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value text-primary">${formatCurrency(reportData.nonMemberRevenueTotal)}</div>
                <div class="metric-label">Revenue Non-Member</div>
                <div style="font-size: 12px; margin-top: 5px;">
                  ${formatCurrency(reportData.nonMemberRevenueToday)} hari ini
                </div>
              </div>
            </div>
          </div>
          
          <!-- REVENUE HIGHLIGHT -->
          <div class="revenue-highlight">
            <h2>💰 Total Pendapatan</h2>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 36px; font-weight: bold; color: #28a745;">
                ${formatCurrency(reportData.totalMembershipRevenue + reportData.nonMemberRevenueTotal)}
              </div>
              <div style="font-size: 16px; color: #6c757d; margin-top: 10px;">
                = ${formatCurrency(reportData.totalMembershipRevenue)} (Member) + 
                ${formatCurrency(reportData.nonMemberRevenueTotal)} (Non-Member)
              </div>
            </div>
          </div>
          
          <!-- DETAIL MEMBER -->
          <div class="section">
            <h2>👥 Detail Member</h2>
            ${reportData.memberList.length > 0 ? `
              <table>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Paket</th>
                  <th>Harga</th>
                  <th>Tanggal Daftar</th>
                  <th>Status</th>
                  <th>Masa Aktif</th>
                </tr>
                ${reportData.memberList.map((member, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${member.fullName}</td>
                    <td>${member.membershipPlan}</td>
                    <td class="text-success">${formatCurrency(member.membershipPrice)}</td>
                    <td>${member.createdAt.toLocaleDateString('id-ID')}</td>
                    <td>
                      <span class="badge ${member.status === 'active' ? 'badge-success' : 'badge-danger'}">
                        ${member.status}
                      </span>
                    </td>
                    <td>${member.masaAktif ? member.masaAktif.toLocaleDateString('id-ID') : '-'}</td>
                  </tr>
                `).join('')}
              </table>
            ` : '<p style="text-align: center; color: #6c757d;">Tidak ada data member</p>'}
          </div>
          
          <!-- DETAIL NON-MEMBER HARIAN -->
          <div class="section">
            <h2>🎫 Non-Member Harian</h2>
            
            <h3>Statistik Harian</h3>
            ${reportData.dailyNonMemberStats.length > 0 ? `
              <table>
                <tr>
                  <th>Tanggal</th>
                  <th>Jumlah</th>
                  <th>Total Revenue</th>
                  <th>Rata-rata per Orang</th>
                </tr>
                ${reportData.dailyNonMemberStats.map(day => `
                  <tr>
                    <td>${day.date}</td>
                    <td>${day.count} orang</td>
                    <td class="text-primary">${formatCurrency(day.revenue)}</td>
                    <td>${formatCurrency(day.count > 0 ? day.revenue / day.count : 0)}</td>
                  </tr>
                `).join('')}
              </table>
            ` : '<p style="text-align: center; color: #6c757d;">Tidak ada data statistik harian</p>'}
            
            <h3>Detail Non-Member</h3>
            ${reportData.nonMemberList.length > 0 ? `
              <table>
                <tr>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Harga</th>
                  <th>Pembayaran</th>
                  <th>Tanggal Daftar</th>
                  <th>Expired</th>
                  <th>Status</th>
                </tr>
                ${reportData.nonMemberList.map((nm, index) => `
                  <tr>
                    <td>${nm.dailyCode}</td>
                    <td>${nm.nama}</td>
                    <td class="text-primary">${formatCurrency(nm.harga)}</td>
                    <td>${nm.paymentMethod}</td>
                    <td>${nm.createdAt.toLocaleDateString('id-ID')}</td>
                    <td>${nm.expiredAt.toLocaleDateString('id-ID')}</td>
                    <td>
                      <span class="badge ${nm.status === 'active' ? 'badge-success' : 'badge-warning'}">
                        ${nm.status}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </table>
            ` : '<p style="text-align: center; color: #6c757d;">Tidak ada data non-member</p>'}
          </div>
          
          <!-- TRANSACTIONS NON-MEMBER -->
          ${reportData.nonMemberTransactions.length > 0 ? `
          <div class="section">
            <h2>💳 Transaksi Non-Member</h2>
            <table>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Jumlah</th>
                <th>Metode</th>
                <th>Tanggal</th>
                <th>Status</th>
              </tr>
              ${reportData.nonMemberTransactions.slice(0, 20).map((tx, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${tx.dailyCode}</td>
                  <td>${tx.nama}</td>
                  <td class="text-primary">${formatCurrency(tx.jumlah)}</td>
                  <td>${tx.metodePembayaran}</td>
                  <td>${tx.createdAt.toLocaleDateString('id-ID')}</td>
                  <td>
                    <span class="badge ${tx.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                      ${tx.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </table>
            ${reportData.nonMemberTransactions.length > 20 ?
            `<p style="text-align: center; color: #6c757d;">... dan ${reportData.nonMemberTransactions.length - 20} transaksi lainnya</p>` : ''}
          </div>
          ` : ''}
          
          <!-- ANALISIS -->
          <div class="section">
            <h2>📈 Analisis</h2>
            <table>
              <tr>
                <th>Metrik</th>
                <th>Member</th>
                <th>Non-Member</th>
                <th>Total</th>
              </tr>
              <tr>
                <td>Jumlah</td>
                <td>${reportData.totalMembers} orang</td>
                <td>${reportData.totalNonMembers} orang</td>
                <td>${reportData.totalMembers + reportData.totalNonMembers} orang</td>
              </tr>
              <tr>
                <td>Aktif Saat Ini</td>
                <td>${reportData.activeMembers} orang</td>
                <td>${reportData.activeNonMembers} orang</td>
                <td>${reportData.activeMembers + reportData.activeNonMembers} orang</td>
              </tr>
              <tr>
                <td>Revenue Total</td>
                <td class="text-success">${formatCurrency(reportData.totalMembershipRevenue)}</td>
                <td class="text-primary">${formatCurrency(reportData.nonMemberRevenueTotal)}</td>
                <td class="text-success" style="font-weight: bold;">
                  ${formatCurrency(reportData.totalMembershipRevenue + reportData.nonMemberRevenueTotal)}
                </td>
              </tr>
              <tr>
                <td>Revenue Bulan Ini</td>
                <td class="text-success">${formatCurrency(reportData.thisMonthRevenue)}</td>
                <td class="text-primary">${formatCurrency(reportData.nonMemberRevenueThisMonth)}</td>
                <td class="text-success" style="font-weight: bold;">
                  ${formatCurrency(reportData.thisMonthRevenue + reportData.nonMemberRevenueThisMonth)}
                </td>
              </tr>
              <tr>
                <td>Rata-rata per Orang</td>
                <td>${formatCurrency(reportData.totalMembers > 0 ? reportData.totalMembershipRevenue / reportData.totalMembers : 0)}</td>
                <td>${formatCurrency(reportData.totalNonMembers > 0 ? reportData.nonMemberRevenueTotal / reportData.totalNonMembers : 0)}</td>
                <td>${formatCurrency((reportData.totalMembers + reportData.totalNonMembers) > 0 ?
              (reportData.totalMembershipRevenue + reportData.nonMemberRevenueTotal) / (reportData.totalMembers + reportData.totalNonMembers) : 0)}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            <p>HS Gym Rancakihiyang - Sistem Informasi Manajemen</p>
            <p>Jl. Rancakihiyang No. 123 • Telepon: (022) 1234567</p>
            <p>Laporan dibuat secara otomatis oleh sistem • Data real-time dari database</p>
          </div>
        </body>
        </html>
      `;

      // Buat blob dan download
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_HSGym_${reportData.period}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Laporan lengkap berhasil diexport! File HTML akan terbuka di browser baru.');

    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Terjadi kesalahan saat mengexport laporan');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Load report saat selectedReport berubah
  useEffect(() => {
    if (!loading && (membersData.length > 0 || nonMembersData.length > 0)) {
      generateDetailedReport();
    }
  }, [selectedReport]);

  if (loading && membersData.length === 0 && nonMembersData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Laporan Lengkap</h2>
            <p className="text-gray-600">Statistik Member & Non-Member Harian</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={exporting}
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
            </select>

            <button
              onClick={generateDetailedReport}
              disabled={exporting || loading}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              <span>📊</span>
              <span>{loading ? 'Memuat...' : 'Refresh Laporan'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToHTML}
            disabled={exporting || (reportData.totalMembers === 0 && reportData.totalNonMembers === 0)}
            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
          >
            <span>📄</span>
            <span>{exporting ? 'Exporting...' : 'Export Laporan Lengkap'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={exporting}
            className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            <span>🔄</span>
            <span>Refresh Halaman</span>
          </button>
        </div>

        {/* Report Period Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm">
            <span className="font-medium">Periode Laporan:</span>
            <span className="ml-2 text-blue-700">{reportData.period}</span>
            <span className="mx-2">•</span>
            <span className="text-blue-700">{reportData.dateRange}</span>
            <span className="mx-2">•</span>
            <span className="text-green-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Data Real-time
            </span>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Ringkasan Statistik</h3>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(reportData.totalMembers)}</div>
            <div className="text-sm text-blue-800">Total Member</div>
            <div className="text-xs text-blue-600 mt-1">
              {reportData.activeMembers} aktif • {reportData.expiredMembers} expired
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatNumber(reportData.totalNonMembers)}</div>
            <div className="text-sm text-green-800">Total Non-Member</div>
            <div className="text-xs text-green-600 mt-1">
              {reportData.activeNonMembers} aktif • {reportData.todayNonMembers} hari ini
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.totalMembershipRevenue)}</div>
            <div className="text-sm text-purple-800">Revenue Member</div>
            <div className="text-xs text-purple-600 mt-1">
              {reportData.newMembersThisMonth} baru bulan ini
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.nonMemberRevenueTotal)}</div>
            <div className="text-sm text-orange-800">Revenue Non-Member</div>
            <div className="text-xs text-orange-600 mt-1">
              {formatCurrency(reportData.nonMemberRevenueToday)} hari ini
            </div>
          </div>
        </div>

        {/* Revenue Highlight */}
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="text-center">
            <h4 className="text-lg font-bold text-gray-800 mb-2">💰 Total Pendapatan</h4>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatCurrency(reportData.totalMembershipRevenue + reportData.nonMemberRevenueTotal)}
            </div>
            <div className="text-gray-600">
              = <span className="text-green-600 font-medium">{formatCurrency(reportData.totalMembershipRevenue)}</span> (Member) +
              <span className="text-blue-600 font-medium ml-2">{formatCurrency(reportData.nonMemberRevenueTotal)}</span> (Non-Member)
            </div>
          </div>
        </div>

        {/* Daily Non-Member Stats */}
        {reportData.dailyNonMemberStats.length > 0 && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <span>📅</span>
              <span className="ml-2">Statistik Non-Member Harian</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.dailyNonMemberStats.slice(0, 7).map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{day.date}</td>
                      <td className="px-4 py-2 text-sm text-blue-600">{day.count} orang</td>
                      <td className="px-4 py-2 text-sm font-medium text-green-600">{formatCurrency(day.revenue)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatCurrency(day.count > 0 ? day.revenue / day.count : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportData.dailyNonMemberStats.length > 7 && (
              <div className="text-center text-sm text-gray-500 mt-2">
                ... dan {reportData.dailyNonMemberStats.length - 7} hari lainnya
              </div>
            )}
          </div>
        )}

        {/* Member vs Non-Member Comparison */}
        <div className="mb-8">
          <h4 className="font-semibold text-gray-800 mb-3">📊 Perbandingan Member vs Non-Member</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-2">👥 Member</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{reportData.totalMembers} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Aktif:</span>
                  <span className="font-medium text-green-600">{reportData.activeMembers} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue Total:</span>
                  <span className="font-medium text-green-600">{formatCurrency(reportData.totalMembershipRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rata-rata per orang:</span>
                  <span className="font-medium">{formatCurrency(reportData.totalMembers > 0 ? reportData.totalMembershipRevenue / reportData.totalMembers : 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">🎫 Non-Member</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{reportData.totalNonMembers} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Aktif:</span>
                  <span className="font-medium text-green-600">{reportData.activeNonMembers} orang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue Total:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(reportData.nonMemberRevenueTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rata-rata per orang:</span>
                  <span className="font-medium">{formatCurrency(reportData.totalNonMembers > 0 ? reportData.nonMemberRevenueTotal / reportData.totalNonMembers : 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">📋 Ringkasan Laporan</h4>
          <p className="text-gray-700 text-sm">
            Total ada <strong>{reportData.totalMembers} member</strong> dengan revenue
            <strong> {formatCurrency(reportData.totalMembershipRevenue)}</strong> dan
            <strong> {reportData.totalNonMembers} non-member harian</strong> dengan revenue
            <strong> {formatCurrency(reportData.nonMemberRevenueTotal)}</strong>.
            Bulan ini terdapat <strong>{reportData.newMembersThisMonth} member baru</strong> dan
            <strong> {reportData.todayNonMembers} non-member hari ini</strong>.
            Total pendapatan keseluruhan adalah
            <strong> {formatCurrency(reportData.totalMembershipRevenue + reportData.nonMemberRevenueTotal)}</strong>.
          </p>
        </div>

        {/* Data Source Info */}
        <div className="mt-6 text-xs text-gray-500 border-t pt-4">
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Data real-time
            </span>
            <span>👥 Members: {reportData.totalMembers}</span>
            <span>🎫 Non-members: {reportData.totalNonMembers}</span>
            <span>💳 Transactions: {reportData.nonMemberTransactions.length}</span>
            <span>📅 Daily stats: {reportData.dailyNonMemberStats.length} hari</span>
          </div>
        </div>
      </div>
    </div>
  );
}