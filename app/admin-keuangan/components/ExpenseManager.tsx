'use client';
import { useState, useEffect } from 'react';

interface ExpenseManagerProps {
  userId: number;
  onAction?: (notification: any) => void;
}

export default function ExpenseManager({ userId, onAction }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<any[]>([]);
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
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await fetch('/api/admin/expenses');
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.data.expenses);
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          jumlah: parseFloat(formData.jumlah),
          created_by: userId
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh data
        loadExpenses();
        
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
            message: `Pengeluaran ${formData.kategori} berhasil ditambahkan`,
            timestamp: new Date()
          });
        }
      } else {
        alert('Gagal menambah pengeluaran: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Terjadi kesalahan saat menambah pengeluaran');
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
                Rp {summary.total?.toLocaleString('id-ID') || 0}
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
                {expenses.length}
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
                {summary.summary?.[0]?.kategori || '-'}
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
                Rp {Math.round(summary.total / expenses.length).toLocaleString('id-ID')}
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
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
          >
            <span>+</span>
            <span>Tambah Pengeluaran</span>
          </button>
        </div>

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-4">Tambah Pengeluaran Baru</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                  Jumlah (Rp)
                </label>
                <input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Deskripsi pengeluaran..."
                />
              </div>

              <div className="md:col-span-2 flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Simpan Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
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
              <tr className="border-b">
                <th className="text-left py-3">Tanggal</th>
                <th className="text-left py-3">Kategori</th>
                <th className="text-left py-3">Deskripsi</th>
                <th className="text-left py-3">Jumlah</th>
                <th className="text-left py-3">Dibuat Oleh</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    {new Date(expense.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {expense.kategori}
                    </span>
                  </td>
                  <td className="py-3">
                    {expense.deskripsi || '-'}
                  </td>
                  <td className="py-3 font-bold text-red-600">
                    Rp {expense.jumlah.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {expense.created_by_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💸</div>
            <p>Belum ada data pengeluaran</p>
          </div>
        )}
      </div>

      {/* Expense Summary by Category */}
      {summary.summary && summary.summary.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Ringkasan per Kategori</h3>
          <div className="space-y-3">
            {summary.summary.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{item.kategori}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">
                    Rp {item.total.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.jumlah_transaksi} transaksi
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