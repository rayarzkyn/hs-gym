'use client';
import { useState, useEffect } from 'react';

interface ExpenseManagerProps {
  userId: string;
  onAction?: (notification: any) => void;
}

interface Expense {
  id: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  tanggal: string | Date;
  created_by?: string;
  created_by_name?: string;
  date?: any;
}

export default function ExpenseManager({ userId, onAction }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    kategori: '',
    deskripsi: '',
    jumlah: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExpenses();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadExpenses, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadExpenses = async () => {
    try {
      console.log('🔄 Loading expenses data...');
      const response = await fetch('/api/admin/expenses');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Expenses data received:', result);

      if (result.success) {
        setExpenses(result.data.expenses || []);
        setSummary(result.data);
      } else {
        throw new Error(result.error || 'Failed to load expenses');
      }
    } catch (error) {
      console.error('❌ Error loading expenses:', error);
      // Fallback to empty data
      setExpenses([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const expenseData = {
        ...formData,
        jumlah: parseFloat(formData.jumlah),
        created_by: userId,
        date: new Date(formData.tanggal),
        created_at: new Date()
      };

      console.log('➕ Adding new expense:', expenseData);

      const response = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();
      console.log('📨 Add expense response:', result);

      if (result.success) {
        // Refresh data
        await loadExpenses();

        // Reset form
        setFormData({
          kategori: '',
          deskripsi: '',
          jumlah: '',
          tanggal: new Date().toISOString().split('T')[0]
        });
        setShowAddForm(false);

        // Notification
        if (onAction) {
          onAction({
            id: Date.now(),
            type: 'expense_added',
            message: `Pengeluaran ${formData.kategori} sebesar Rp ${parseFloat(formData.jumlah).toLocaleString('id-ID')} berhasil ditambahkan`,
            timestamp: new Date()
          });
        }
      } else {
        throw new Error(result.error || 'Gagal menambah pengeluaran');
      }
    } catch (error) {
      console.error('❌ Error adding expense:', error);
      if (onAction) {
        onAction({
          id: Date.now(),
          type: 'error',
          message: 'Gagal menambah pengeluaran',
          timestamp: new Date(),
          isError: true
        });
      }
    }
  };

  const expenseCategories = [
    'Gaji Karyawan',
    'Listrik & Air',
    'Maintenance Equipment',
    'Kebersihan',
    'Internet',
    'Pajak',
    'Lainnya'
  ];

  // Calculate summary if not provided
  const calculatedSummary = {
    total: expenses.reduce((sum, expense) => sum + (expense.jumlah || 0), 0),
    count: expenses.length,
    byCategory: expenses.reduce((acc: any, expense) => {
      const category = expense.kategori || 'Lainnya';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }
      acc[category].total += expense.jumlah || 0;
      acc[category].count += 1;
      return acc;
    }, {})
  };

  const mostFrequentCategory = Object.entries(calculatedSummary.byCategory)
    .sort(([, a]: any, [, b]: any) => b.total - a.total)[0];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-xl font-bold text-gray-800">
                Rp {calculatedSummary.total.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Jumlah Transaksi</p>
              <p className="text-xl font-bold text-gray-800">
                {calculatedSummary.count}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Kategori Terbanyak</p>
              <p className="text-xl font-bold text-gray-800">
                {mostFrequentCategory ? mostFrequentCategory[0] : '-'}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🏷️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Rata-rata</p>
              <p className="text-xl font-bold text-gray-800">
                Rp {calculatedSummary.count > 0 ? Math.round(calculatedSummary.total / calculatedSummary.count).toLocaleString('id-ID') : '0'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Manajemen Pengeluaran</h2>
          <div className="flex space-x-3">
            <button
              onClick={loadExpenses}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Tambah Pengeluaran</span>
            </button>
          </div>
        </div>

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <h3 className="font-bold mb-4 text-lg">Tambah Pengeluaran Baru</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori *
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah (Rp) *
                </label>
                <input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal *
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Deskripsi pengeluaran..."
                />
              </div>

              <div className="md:col-span-2 flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium"
                >
                  Simpan Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Kategori</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Deskripsi</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Jumlah</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Dibuat Oleh</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense: any) => {
                // Safe date formatting - handle ISO string or Date object
                let displayDate = '-';
                try {
                  const dateValue = expense.date || expense.tanggal;
                  if (dateValue) {
                    displayDate = new Date(dateValue).toLocaleDateString('id-ID');
                  }
                } catch {
                  displayDate = '-';
                }

                // Get values with fallbacks
                const amount = expense.amount || expense.jumlah || 0;
                const category = expense.category || expense.kategori || 'Lainnya';
                const description = expense.description || expense.deskripsi || '-';
                const createdBy = expense.createdBy || expense.created_by || expense.created_by_name || 'System';

                return (
                  <tr key={expense.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">{displayDate}</td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {category}
                      </span>
                    </td>
                    <td className="py-3 px-4">{description}</td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      Rp {amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{createdBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">💸</div>
            <p className="text-lg">Belum ada data pengeluaran</p>
            <p className="text-sm mt-2">Klik "Tambah Pengeluaran" untuk menambah data</p>
          </div>
        )}
      </div>

      {/* Expense Summary by Category */}
      {Object.keys(calculatedSummary.byCategory).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Ringkasan per Kategori</h3>
          <div className="space-y-3">
            {Object.entries(calculatedSummary.byCategory)
              .sort(([, a]: any, [, b]: any) => b.total - a.total)
              .map(([category, data]: [string, any]) => (
                <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      Rp {data.total.toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {data.count} transaksi
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}