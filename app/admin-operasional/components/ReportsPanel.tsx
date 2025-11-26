'use client';
import { useState, useEffect } from 'react';

interface ReportsPanelProps {
  // Props bisa ditambahkan sesuai kebutuhan
}

interface ReportData {
  period: string;
  totalVisitors: number;
  totalRevenue: number;
  activeMembers: number;
  newMembers: number;
  facilityUsage: number;
  peakHours: string[];
  popularFacilities: Array<{
    name: string;
    usage: number;
    percentage: number;
  }>;
  memberVisitors?: number;
  nonMemberVisitors?: number;
  totalTransactions?: number;
}

export default function ReportsPanel({}: ReportsPanelProps) {
  const [selectedReport, setSelectedReport] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadQuickReport();
  }, [selectedReport]);

  const loadQuickReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operasional/reports?type=${selectedReport}`);
      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
      }
    } catch (error) {
      console.error('Error loading quick report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    try {
      setLoading(true);
      const response = await fetch('/api/operasional/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: selectedReport,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
        
        // Simulasi download
        alert(`Laporan ${selectedReport} berhasil dibuat dalam format ${format.toUpperCase()}`);
        
        // Untuk implementasi real, gunakan result.downloadUrl
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
      } else {
        alert('Gagal membuat laporan: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Terjadi kesalahan saat membuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const getReportTitle = () => {
    const titles = {
      daily: 'Laporan Harian',
      weekly: 'Laporan Mingguan',
      monthly: 'Laporan Bulanan',
      yearly: 'Laporan Tahunan'
    };
    return titles[selectedReport];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !reportData) {
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
            <h2 className="text-2xl font-bold text-gray-800">Generator Laporan</h2>
            <p className="text-gray-600">Buat laporan operasional gym</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Report Type Selector */}
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>

            {/* Date Range (untuk weekly, monthly, yearly) */}
            {selectedReport !== 'daily' && (
              <>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateReport('pdf')}
            disabled={loading}
            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
          >
            <span>📄</span>
            <span>Generate PDF</span>
          </button>
          
          <button
            onClick={() => generateReport('excel')}
            disabled={loading}
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
          >
            <span>📊</span>
            <span>Generate Excel</span>
          </button>
          
          <button
            onClick={() => generateReport('csv')}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            <span>📋</span>
            <span>Generate CSV</span>
          </button>

          <button
            onClick={loadQuickReport}
            disabled={loading}
            className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Preview */}
      {reportData && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Pratinjau Laporan {getReportTitle()}</h3>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.totalVisitors}</div>
              <div className="text-sm text-blue-800">Total Pengunjung</div>
              <div className="text-xs text-blue-600 mt-1">
                {reportData.memberVisitors} member • {reportData.nonMemberVisitors} non-member
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalRevenue)}</div>
              <div className="text-sm text-green-800">Total Pendapatan</div>
              <div className="text-xs text-green-600 mt-1">
                {reportData.totalTransactions} transaksi
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{reportData.activeMembers}</div>
              <div className="text-sm text-purple-800">Member Aktif</div>
              <div className="text-xs text-purple-600 mt-1">
                +{reportData.newMembers} baru
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{reportData.facilityUsage}%</div>
              <div className="text-sm text-orange-800">Utilization</div>
              <div className="text-xs text-orange-600 mt-1">
                Rata-rata penggunaan
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">🕐 Jam Puncak</h4>
              <div className="space-y-2">
                {reportData.peakHours.map((hour, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">{hour}</span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                      Puncak {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Facilities */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">🏋️ Fasilitas Populer</h4>
              <div className="space-y-3">
                {reportData.popularFacilities.map((facility, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{facility.name}</span>
                      <span className="text-gray-600">{facility.usage} pengguna ({facility.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${facility.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📈 Ringkasan Kinerja</h4>
            <p className="text-blue-700 text-sm">
              Periode laporan menunjukkan {reportData.totalVisitors} total kunjungan dengan pendapatan {formatCurrency(reportData.totalRevenue)}. 
              Fasilitas gym digunakan rata-rata {reportData.facilityUsage}% dengan jam puncak {reportData.peakHours[0]}.
            </p>
          </div>
        </div>
      )}

      {/* Report Templates */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Template Laporan Cepat</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setSelectedReport('daily');
              setDateRange({
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              });
            }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
          >
            <div className="text-2xl mb-2">📅</div>
            <h4 className="font-semibold text-gray-800">Laporan Harian</h4>
            <p className="text-gray-600 text-sm">Ringkasan aktivitas hari ini</p>
          </button>

          <button
            onClick={() => {
              setSelectedReport('weekly');
              const weekStart = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
              setDateRange({
                startDate: weekStart,
                endDate: new Date().toISOString().split('T')[0]
              });
            }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
          >
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold text-gray-800">Laporan Mingguan</h4>
            <p className="text-gray-600 text-sm">Analisis 7 hari terakhir</p>
          </button>

          <button
            onClick={() => {
              setSelectedReport('monthly');
              const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
              setDateRange({
                startDate: monthStart,
                endDate: monthEnd
              });
            }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
          >
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-semibold text-gray-800">Laporan Bulanan</h4>
            <p className="text-gray-600 text-sm">Performance bulan berjalan</p>
          </button>
        </div>
      </div>
    </div>
  );
}