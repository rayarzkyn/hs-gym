'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Components
import FinancialStats from './components/FinancialStats';
import PendingPayments from './components/PendingPayments';
import RevenueChart from './components/RevenueChart';
import ExpenseManager from './components/ExpenseManager';
import ExportPanel from './components/ExportPanel';
import NotificationCenter from './components/NotificationCenter';

export default function AdminKeuangan() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'admin_keuangan') {
      router.push('/login');
      return;
    }
    
    setUser(userObj);
    loadDashboardData();
    
    // Setup real-time updates
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [financialRes, pendingRes] = await Promise.all([
        fetch('/api/admin/financial-reports?period=monthly'),
        fetch('/api/admin/pending-payments')
      ]);

      // Check if responses are OK
      if (!financialRes.ok) {
        throw new Error(`Financial reports failed: ${financialRes.status}`);
      }

      if (!pendingRes.ok) {
        throw new Error(`Pending payments failed: ${pendingRes.status}`);
      }

      // Check content type before parsing
      const financialContentType = financialRes.headers.get('content-type');
      const pendingContentType = pendingRes.headers.get('content-type');

      if (!financialContentType?.includes('application/json')) {
        const text = await financialRes.text();
        console.error('Non-JSON response from financial-reports:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON');
      }

      if (!pendingContentType?.includes('application/json')) {
        const text = await pendingRes.text();
        console.error('Non-JSON response from pending-payments:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON');
      }

      const [financialData, pendingData] = await Promise.all([
        financialRes.json(),
        pendingRes.json()
      ]);

      if (financialData.success) {
        setFinancialData(financialData.data);
      } else {
        throw new Error(financialData.error || 'Failed to load financial data');
      }
      
      // Add notification for pending payments
      if (pendingData.success && pendingData.data.length > 0) {
        const hasExistingNotification = notifications.some(n => n.type === 'pending_payments');
        if (!hasExistingNotification) {
          addNotification({
            id: Date.now(),
            type: 'pending_payments',
            message: `${pendingData.data.length} pembayaran menunggu verifikasi`,
            timestamp: new Date(),
            count: pendingData.data.length
          });
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data');
      
      // Add error notification
      addNotification({
        id: Date.now(),
        type: 'error',
        message: 'Gagal memuat data dashboard',
        timestamp: new Date(),
        isError: true
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const addNotification = (notification: any) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'payments', label: 'Verifikasi Pembayaran', icon: '💳' },
    { id: 'expenses', label: 'Pengeluaran', icon: '💰' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
    { id: 'export', label: 'Export Data', icon: '📤' },
  ];

  const renderTabContent = () => {
    if (loading && activeTab === 'dashboard') {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      );
    }

    if (error && activeTab === 'dashboard') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return financialData ? (
          <div className="space-y-6 animate-fade-in">
            <FinancialStats data={financialData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={financialData.revenue} />
              <div className="space-y-6">
                <PendingPayments preview onAction={addNotification} />
                <ExportPanel preview />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">Tidak ada data yang tersedia</div>
          </div>
        );

      case 'payments':
        return <PendingPayments onAction={addNotification} />;

      case 'expenses':
        return <ExpenseManager userId={user.id} onAction={addNotification} />;

      case 'reports':
        return financialData ? (
          <div className="animate-fade-in">
            <FinancialStats data={financialData} detailed />
            <div className="mt-6">
              <RevenueChart data={financialData.revenue} detailed />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">Tidak ada data laporan yang tersedia</div>
          </div>
        );

      case 'export':
        return <ExportPanel detailed />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Keuangan</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter 
                notifications={notifications}
                onRemove={removeNotification}
                onClearAll={clearAllNotifications}
              />
              
              <div className="flex items-center space-x-3">
                <span className="text-gray-700">
                  Halo, <strong>{user.nama || user.username}</strong>
                </span>
                <button 
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        {renderTabContent()}
      </div>

      {/* Global Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}