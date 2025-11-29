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
  const [authChecked, setAuthChecked] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    if (authChecked) return;

    const checkAuth = () => {
      const userData = localStorage.getItem('user');
      const staffUser = localStorage.getItem('staffUser');
      
      console.log('🔄 AdminKeuangan - Checking auth...', {
        hasUser: !!userData,
        hasStaff: !!staffUser
      });

      let userObj = null;
      if (userData) {
        try {
          userObj = JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      } else if (staffUser) {
        try {
          userObj = JSON.parse(staffUser);
        } catch (e) {
          console.error('Error parsing staff data:', e);
        }
      }

      if (!userObj) {
        console.log('❌ No user found, redirecting to login');
        setAuthChecked(true);
        router.push('/login');
        return;
      }
      
      // Check role - allow multiple finance roles
      const allowedRoles = ['admin_keuangan', 'keuangan', 'admin'];
      if (!allowedRoles.includes(userObj.role)) {
        console.log('❌ Invalid role:', userObj.role, 'redirecting to login');
        setAuthChecked(true);
        router.push('/login');
        return;
      }
      
      console.log('✅ Auth valid, setting user:', userObj.role);
      setUser(userObj);
      setAuthChecked(true);
      loadDashboardData();
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router, authChecked]);

  // HAPUS INTERVAL - hanya load data sekali saat mount
  // useEffect(() => {
  //   if (!user) return;
    
  //   // Setup interval untuk real-time updates - DIHAPUS
  //   const interval = setInterval(() => {
  //     loadDashboardData();
  //   }, 30000); // Update every 30 seconds

  //   return () => clearInterval(interval);
  // }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading dashboard data...');
      
      const [financialRes, pendingRes] = await Promise.all([
        fetch('/api/admin/financial-reports?period=monthly'),
        fetch('/api/admin/pending-payments')
      ]);

      console.log('📊 Financial response status:', financialRes.status);
      console.log('💳 Pending response status:', pendingRes.status);

      if (!financialRes.ok) {
        const errorText = await financialRes.text();
        console.error('❌ Financial reports error:', errorText);
        throw new Error(`Laporan keuangan gagal: ${financialRes.status}`);
      }

      if (!pendingRes.ok) {
        const errorText = await pendingRes.text();
        console.error('❌ Pending payments error:', errorText);
        throw new Error(`Data pembayaran pending gagal: ${pendingRes.status}`);
      }

      const financialContentType = financialRes.headers.get('content-type');
      const pendingContentType = pendingRes.headers.get('content-type');

      if (!financialContentType?.includes('application/json')) {
        const text = await financialRes.text();
        console.error('Non-JSON response from financial-reports:', text.substring(0, 200));
        throw new Error('Server mengembalikan HTML bukan JSON');
      }

      if (!pendingContentType?.includes('application/json')) {
        const text = await pendingRes.text();
        console.error('Non-JSON response from pending-payments:', text.substring(0, 200));
        throw new Error('Server mengembalikan HTML bukan JSON');
      }

      const [financialResult, pendingResult] = await Promise.all([
        financialRes.json(),
        pendingRes.json()
      ]);

      console.log('📈 Financial data received:', financialResult.success);
      console.log('💸 Pending data received:', pendingResult.success);

      if (financialResult.success) {
        setFinancialData(financialResult.data);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        throw new Error(financialResult.error || 'Gagal memuat data keuangan');
      }
      
      // Add notification for pending payments
      if (pendingResult.success && pendingResult.data && pendingResult.data.length > 0) {
        const hasExistingNotification = notifications.some(n => n.type === 'pending_payments');
        if (!hasExistingNotification) {
          addNotification({
            id: Date.now(),
            type: 'pending_payments',
            message: `${pendingResult.data.length} pembayaran menunggu verifikasi`,
            timestamp: new Date(),
            count: pendingResult.data.length,
            priority: 'high'
          });
        }
      }

      // Add success notification for data load
      addNotification({
        id: Date.now() + 1,
        type: 'info',
        message: 'Data dashboard berhasil dimuat',
        timestamp: new Date(),
        autoClose: true
      });

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
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

  const handleRefreshData = () => {
    loadDashboardData();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('staffUser');
    router.push('/');
  };

  const addNotification = (notification: any) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">Memeriksa authentication...</div>
        </div>
      </div>
    );
  }

  // Show loading if no user (after auth check)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl">Redirecting...</div>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      );
    }

    if (error && activeTab === 'dashboard') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Memuat Data</div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={loadDashboardData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => setError(null)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return financialData ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <FinancialStats data={financialData} lastUpdate={lastUpdate} />
              <button
                onClick={handleRefreshData}
                className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2 transition-colors"
                title="Refresh data"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={financialData.chartData} />
              <div className="space-y-6">
                <PendingPayments preview onAction={addNotification} />
                <ExportPanel preview />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">Tidak ada data yang tersedia</div>
            <button
              onClick={loadDashboardData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Muat Data
            </button>
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
              <RevenueChart data={financialData.chartData} detailed />
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
                <div className="text-right">
                  <span className="text-gray-700 block">
                    Halo, <strong>{user.nama || user.username}</strong>
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                </div>
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