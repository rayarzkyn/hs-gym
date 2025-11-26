'use client';
import { useState } from 'react';
import { generateExcel, generatePDF } from '@/lib/exportUtils';

interface ExportPanelProps {
  preview?: boolean;
  detailed?: boolean;
}

export default function ExportPanel({ preview = false, detailed = false }: ExportPanelProps) {
  const [exportType, setExportType] = useState<'transactions' | 'members' | 'financial'>('transactions');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Harap pilih tanggal mulai dan tanggal akhir');
      return;
    }

    setIsExporting(true);
    try {
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

      if (result.success) {
        if (exportFormat === 'excel') {
          generateExcel(result.data.data, result.data.filename.replace('.pdf', ''));
        } else {
          generatePDF(result.data.data, result.data.filename, exportType);
        }
        
        alert(`Laporan berhasil di-generate: ${result.data.filename}`);
      } else {
        alert('Gagal mengekspor data: ' + result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Terjadi kesalahan saat mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const quickExports = [
    {
      label: 'Hari Ini',
      getDates: () => {
        const today = new Date().toISOString().split('T')[0];
        return { startDate: today, endDate: today };
      }
    },
    {
      label: 'Minggu Ini',
      getDates: () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Bulan Ini',
      getDates: () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    }
  ];

  const handleQuickExport = (quickExport: any) => {
    const dates = quickExport.getDates();
    setDateRange(dates);
    // Auto-trigger export after a short delay
    setTimeout(() => {
      handleExport();
    }, 100);
  };

  if (preview) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">Export Data</h3>
        <p className="text-gray-600 mb-4">
          Export data keuangan dalam format Excel atau PDF
        </p>
        <button
          onClick={() => window.location.href = '/admin-keuangan?tab=export'}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-medium"
        >
          Buka Export Panel
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Export Data</h2>

      {/* Export Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Data
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="transactions">Data Transaksi</option>
              <option value="members">Data Member</option>
              <option value="financial">Laporan Keuangan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format Export
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={(e) => setExportFormat(e.target.value as 'excel')}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span>Excel (.csv)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span>PDF</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Export Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Export Cepat</h3>
        <div className="flex flex-wrap gap-2">
          {quickExports.map((quickExport, index) => (
            <button
              key={index}
              onClick={() => handleQuickExport(quickExport)}
              disabled={isExporting}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {quickExport.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Export Button */}
      <div className="flex space-x-4">
        <button
          onClick={handleExport}
          disabled={isExporting || !dateRange.startDate || !dateRange.endDate}
          className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center space-x-2"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Export Data</span>
            </>
          )}
        </button>
      </div>

      {/* Export Information */}
      {detailed && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Informasi Export</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Data Transaksi:</strong> Detail semua transaksi dalam periode tertentu</li>
            <li>• <strong>Data Member:</strong> Informasi member dan riwayat keanggotaan</li>
            <li>• <strong>Laporan Keuangan:</strong> Ringkasan pendapatan dan statistik</li>
            <li>• File Excel kompatibel dengan Microsoft Excel dan Google Sheets</li>
            <li>• File PDF siap untuk dicetak atau dibagikan</li>
          </ul>
        </div>
      )}
    </div>
  );
}