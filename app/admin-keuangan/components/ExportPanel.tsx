'use client';
import { useState, useEffect } from 'react';

interface ExportPanelProps {
  preview?: boolean;
  detailed?: boolean;
}

interface ExportData {
  type: 'transactions' | 'members' | 'financial' | 'expenses';
  startDate: string;
  endDate: string;
  format: 'excel' | 'pdf';
}

interface ExportHistoryItem {
  id: number;
  type: string;
  format: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  timestamp: string;
  filename: string;
  recordCount: number;
}

export default function ExportPanel({ preview = false, detailed = false }: ExportPanelProps) {
  const [exportType, setExportType] = useState<'transactions' | 'members' | 'financial' | 'expenses'>('transactions');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExportHistory();
  }, []);

  const loadExportHistory = async () => {
    try {
      // Load recent exports from localStorage
      const history = localStorage.getItem('exportHistory');
      if (history) {
        setExportHistory(JSON.parse(history).slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading export history:', error);
    }
  };

  const saveExportHistory = (exportData: ExportHistoryItem) => {
    try {
      const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
      const newHistory = [exportData, ...history].slice(0, 10);
      localStorage.setItem('exportHistory', JSON.stringify(newHistory));
      setExportHistory(newHistory.slice(0, 5));
    } catch (error) {
      console.error('Error saving export history:', error);
    }
  };

  const generateExcel = (data: any[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
      }

      console.log('📊 Generating Excel file:', { recordCount: data.length, filename });

      // Simple CSV generator
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => {
          // Handle various value types
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if contains comma
            const escaped = value.replace(/"/g, '""');
            return value.includes(',') ? `"${escaped}"` : escaped;
          }
          if (typeof value === 'number') {
            return value.toString();
          }
          return String(value);
        }).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log('✅ Excel file generated successfully');
    } catch (error) {
      console.error('❌ Error generating Excel:', error);
      alert('Gagal generate file Excel: ' + error);
    }
  };

  const generatePDF = (data: any[], filename: string, type: string) => {
    try {
      if (!data || data.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
      }

      console.log('📄 Generating PDF file:', { recordCount: data.length, filename, type });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup diblokir. Izinkan popup untuk generate PDF.');
        return;
      }

      const title = 
        type === 'transactions' ? 'Laporan Transaksi' : 
        type === 'members' ? 'Data Member' : 
        type === 'financial' ? 'Laporan Keuangan' : 
        'Laporan Pengeluaran';

      const tableHeaders = Object.keys(data[0] || {});
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 20px; 
                color: #333;
                line-height: 1.4;
              }
              h1 { 
                color: #2c5aa0; 
                border-bottom: 3px solid #2c5aa0; 
                padding-bottom: 10px; 
                text-align: center;
                margin-bottom: 20px;
              }
              .summary { 
                background: #f8f9fa; 
                padding: 15px; 
                margin: 20px 0; 
                border-radius: 8px;
                border-left: 4px solid #2c5aa0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                font-size: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 10px; 
                text-align: left; 
                vertical-align: top;
              }
              th { 
                background-color: #2c5aa0; 
                color: white;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 11px;
              }
              tr:nth-child(even) {
                background-color: #f8f9fa;
              }
              tr:hover {
                background-color: #e9ecef;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 11px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 10px;
              }
              .amount {
                text-align: right;
                font-family: 'Courier New', monospace;
              }
              @media print {
                body { margin: 10mm; }
                .no-print { display: none; }
                table { font-size: 10px; }
              }
              @media all {
                .page-break { display: none; }
              }
              @media print {
                .page-break { display: block; page-break-before: always; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            
            <div class="summary">
              <strong>Periode:</strong> ${new Date(dateRange.startDate).toLocaleDateString('id-ID')} - ${new Date(dateRange.endDate).toLocaleDateString('id-ID')}<br>
              <strong>Tanggal Export:</strong> ${new Date().toLocaleDateString('id-ID')}<br>
              <strong>Jumlah Data:</strong> ${data.length} records<br>
              <strong>Format:</strong> PDF
            </div>

            <table>
              <thead>
                <tr>
                  ${tableHeaders.map(header => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map((row, index) => `
                  <tr>
                    ${tableHeaders.map(header => {
                      const value = row[header];
                      // Format numbers with IDR currency if it's an amount field
                      if (typeof value === 'number' && (header.toLowerCase().includes('jumlah') || header.toLowerCase().includes('harga') || header.toLowerCase().includes('pendapatan') || header.toLowerCase().includes('pengeluaran') || header.toLowerCase().includes('total') || header.toLowerCase().includes('amount'))) {
                        return `<td class="amount">Rp ${value.toLocaleString('id-ID')}</td>`;
                      }
                      // Format dates
                      if (typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}/)) {
                        try {
                          return `<td>${new Date(value).toLocaleDateString('id-ID')}</td>`;
                        } catch {
                          return `<td>${value}</td>`;
                        }
                      }
                      return `<td>${value || ''}</td>`;
                    }).join('')}
                  </tr>
                  ${(index + 1) % 25 === 0 ? '<div class="page-break"></div>' : ''}
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              Generated by HS Gym Management System • ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}
            </div>

            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #2c5aa0; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                🖨️ Print PDF
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px; font-size: 14px;">
                ✕ Tutup
              </button>
            </div>

            <script>
              // Auto-print after page loads
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      console.log('✅ PDF file generated successfully');

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Gagal generate file PDF: ' + error);
    }
  };

  const handleExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Harap pilih tanggal mulai dan tanggal akhir');
      return;
    }

    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      console.log('📤 Starting export...', { exportType, dateRange, exportFormat });
      
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: exportType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format: exportFormat
        }),
      });

      const result = await response.json();
      console.log('📨 Export response:', result);

      if (result.success) {
        const exportData: ExportHistoryItem = {
          id: Date.now(),
          type: exportType,
          format: exportFormat,
          dateRange: { ...dateRange },
          timestamp: new Date().toISOString(),
          filename: result.data.filename,
          recordCount: result.data.recordCount || result.data.data?.length || 0
        };

        saveExportHistory(exportData);

        if (exportFormat === 'excel') {
          generateExcel(result.data.data, result.data.filename);
        } else {
          generatePDF(result.data.data, result.data.filename, exportType);
        }
        
        // Show success message
        setTimeout(() => {
          alert(`✅ Laporan berhasil di-generate!\n\nFile: ${result.data.filename}\nTotal data: ${result.data.recordCount || result.data.data?.length || 0} records\nFormat: ${exportFormat.toUpperCase()}`);
        }, 1000);

      } else {
        throw new Error(result.error || 'Gagal mengekspor data');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengekspor data';
      setError(errorMessage);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // PERBAIKAN: Fungsi quick export yang benar dengan ikon yang sesuai
  const quickExports = [
    {
      label: 'Hari Ini',
      icon: '📅',
      getDates: () => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        return { 
          startDate: todayStr, 
          endDate: todayStr 
        };
      },
      description: 'Data hari ini saja'
    },
    {
      label: 'Minggu Ini',
      icon: '📆',
      getDates: () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Minggu, 1 = Senin, ...
        const startOfWeek = new Date(today);
        
        // Hitung mundur ke hari Senin
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      },
      description: 'Data dari Senin sampai hari ini'
    },
    {
      label: 'Bulan Ini',
      icon: '🗓️',
      getDates: () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      },
      description: 'Data dari tanggal 1 sampai hari ini'
    },
    {
      label: 'Bulan Lalu',
      icon: '⏪',
      getDates: () => {
        const today = new Date();
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          startDate: startOfLastMonth.toISOString().split('T')[0],
          endDate: endOfLastMonth.toISOString().split('T')[0]
        };
      },
      description: 'Data bulan sebelumnya'
    }
  ];

  const handleQuickExport = (quickExport: any) => {
    const dates = quickExport.getDates();
    setDateRange(dates);
    setError(null);
    
    // Tampilkan pesan konfirmasi
    const confirmExport = confirm(
      `Export data ${quickExport.label}?\n\n` +
      `Periode: ${dates.startDate} - ${dates.endDate}\n` +
      `${quickExport.description}\n\n` +
      `Klik OK untuk melanjutkan.`
    );
    
    if (confirmExport) {
      // Auto-trigger export after a short delay
      setTimeout(() => {
        handleExport();
      }, 500);
    }
  };

  const exportTypes = [
    { 
      value: 'transactions', 
      label: 'Data Transaksi', 
      icon: '💳', 
      description: 'Detail semua transaksi pembayaran membership dan daily pass' 
    },
    { 
      value: 'members', 
      label: 'Data Member', 
      icon: '👥', 
      description: 'Informasi member dan keanggotaan' 
    },
    { 
      value: 'financial', 
      label: 'Laporan Keuangan', 
      icon: '📊', 
      description: 'Ringkasan pendapatan, pengeluaran, dan statistik keuangan' 
    },
    { 
      value: 'expenses', 
      label: 'Laporan Pengeluaran', 
      icon: '💸', 
      description: 'Detail pengeluaran operasional gym' 
    }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (preview) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">Export Data</h3>
        <p className="text-gray-600 mb-4">
          Export data keuangan dalam format Excel atau PDF untuk analisis dan backup
        </p>
        <button
          onClick={() => window.location.href = '/admin-keuangan?tab=export'}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition font-medium flex items-center justify-center space-x-2"
        >
          <span>📤</span>
          <span>Buka Export Panel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-100">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <div className="w-3 h-8 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-full mr-3"></div>
            <h2 className="text-2xl font-bold text-gray-800">Export Data</h2>
          </div>
          <p className="text-gray-600 mt-1">Export data sistem untuk analisis dan reporting</p>
        </div>
        <button
          onClick={loadExportHistory}
          className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2.5 rounded-xl hover:from-gray-700 hover:to-gray-800 flex items-center space-x-2 transition-all duration-300 font-medium shadow-lg"
          disabled={isExporting}
        >
          <span>🔄</span>
          <span>Refresh History</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2 text-rose-700">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Export Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="mr-2">📊</span>
              <span>Jenis Data</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {exportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setExportType(type.value as any);
                    setError(null);
                  }}
                  className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                    exportType === type.value
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md transform scale-105'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                  } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isExporting}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-bold text-gray-800">{type.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                    </div>
                  </div>
                  {exportType === type.value && (
                    <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                      Dipilih
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="mr-2">📁</span>
              <span>Format Export</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-xl transition-all duration-300 hover:shadow-sm ${
                isExporting ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                exportFormat === 'excel'
                  ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center">
                  <input
                    type="radio"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value as 'excel')}
                    className="text-emerald-500 focus:ring-emerald-500 h-5 w-5"
                    disabled={isExporting}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📊</span>
                    <div>
                      <div className="font-bold">Excel (.csv)</div>
                      <div className="text-xs text-gray-600">Untuk analisis data</div>
                    </div>
                  </div>
                  {exportFormat === 'excel' && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                      Dipilih
                    </div>
                  )}
                </div>
              </label>
              
              <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-xl transition-all duration-300 hover:shadow-sm ${
                isExporting ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                exportFormat === 'pdf'
                  ? 'border-red-500 bg-gradient-to-r from-red-50 to-pink-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                    className="text-red-500 focus:ring-red-500 h-5 w-5"
                    disabled={isExporting}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="font-bold">PDF</div>
                      <div className="text-xs text-gray-600">Untuk presentasi</div>
                    </div>
                  </div>
                  {exportFormat === 'pdf' && (
                    <div className="mt-2 text-xs text-red-600 font-medium flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                      Dipilih
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Date Range */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="mr-2">📅</span>
              <span>Periode Data</span>
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setDateRange(prev => ({...prev, startDate: e.target.value}));
                    setError(null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white shadow-sm"
                  disabled={isExporting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Tanggal Akhir</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setDateRange(prev => ({...prev, endDate: e.target.value}));
                    setError(null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white shadow-sm"
                  disabled={isExporting}
                />
              </div>
            </div>
          </div>

          {/* Quick Export Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="mr-2">⚡</span>
              <span>Export Cepat</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickExports.map((quickExport, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickExport(quickExport)}
                  disabled={isExporting}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg hover:shadow-xl group"
                  title={quickExport.description}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg mb-1">{quickExport.icon}</span>
                    <span>{quickExport.label}</span>
                    <span className="text-xs opacity-80 mt-1">{quickExport.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 italic">
              Klik tombol untuk export data berdasarkan periode tertentu
            </div>
          </div>
        </div>
      </div>

      {/* Main Export Button */}
      <div className="mb-6">
        <button
          onClick={handleExport}
          disabled={isExporting || !dateRange.startDate || !dateRange.endDate}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Memproses Export...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🚀</span>
              <div className="text-center">
                <div>Export Data Sekarang</div>
                <div className="text-sm opacity-90 font-normal">
                  {exportTypes.find(t => t.value === exportType)?.label} • {exportFormat.toUpperCase()}
                </div>
              </div>
              <span className="text-2xl">📤</span>
            </>
          )}
        </button>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <span className="mr-2">📜</span>
            <span>Riwayat Export Terbaru</span>
          </h3>
          <div className="space-y-3">
            {exportHistory.map((item) => (
              <div key={item.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                <div className="flex-1 mb-3 lg:mb-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {exportTypes.find(t => t.value === item.type)?.icon}
                    </span>
                    <div>
                      <div className="font-bold text-gray-800">
                        {exportTypes.find(t => t.value === item.type)?.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(item.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Format: {item.format.toUpperCase()}</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Data: {item.recordCount} records</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Periode: {new Date(item.dateRange.startDate).toLocaleDateString('id-ID')} - {new Date(item.dateRange.endDate).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="text-right w-full lg:w-auto">
                  <div className="text-sm font-mono text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                    📁 {item.filename}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Information */}
      {detailed && (
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 shadow-sm">
          <h4 className="font-bold text-blue-800 mb-3 text-lg flex items-center">
            <span className="mr-2">💡</span>
            <span>Informasi Export</span>
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm text-blue-700">
            <div>
              <h5 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📊</span>
                <span>Jenis Data Tersedia:</span>
              </h5>
              <ul className="space-y-2">
                {exportTypes.map(type => (
                  <li key={type.value} className="flex items-start">
                    <span className="text-lg mr-2">{type.icon}</span>
                    <div>
                      <strong>{type.label}:</strong> {type.description}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">⚡</span>
                <span>Tips Export:</span>
              </h5>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Gunakan Export Cepat</strong> untuk periode yang umum</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Excel (.csv)</strong> cocok untuk analisis data lebih lanjut</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>PDF</strong> ideal untuk laporan yang akan dicetak</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Data akan secara otomatis terdownload ke perangkat Anda</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 max-w-md mx-4 border border-gray-200 shadow-2xl">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-t-4 border-white rounded-full animate-spin"></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">Memproses Export</div>
                <div className="text-sm text-gray-600">
                  Sedang menyiapkan {exportTypes.find(t => t.value === exportType)?.label}...
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-gray-500 mt-4">
              Mohon tunggu sebentar. Proses ini mungkin memerlukan waktu beberapa saat.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}