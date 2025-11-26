'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugAuth() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('=== DEBUG AUTH ===');
    console.log('User from localStorage:', user);
    console.log('Token from localStorage:', token);
    
    if (user) {
      const userObj = JSON.parse(user);
      console.log('Parsed user object:', userObj);
      console.log('User role:', userObj.role);
    }
  }, []);

  const simulateLogin = (role: string) => {
    const userData = {
      id: 1,
      nama: 'Test User',
      role: role,
      email: 'test@example.com'
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', 'test-token');
    
    console.log(`Simulated login as ${role}`);
    
    if (role === 'member') {
      router.push('/member-dashboard');
    } else if (role === 'non_member') {
      router.push('/non-member-dashboard');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Authentication</h1>
      <div className="space-y-2">
        <button 
          onClick={() => simulateLogin('member')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Simulate Member Login
        </button>
        <button 
          onClick={() => simulateLogin('non_member')}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Simulate Non-Member Login
        </button>
        <button 
          onClick={() => {
            localStorage.clear();
            console.log('LocalStorage cleared');
          }}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Clear Storage
        </button>
      </div>
    </div>
  );
}