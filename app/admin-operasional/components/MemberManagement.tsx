'use client';
import { useState, useEffect } from 'react';

interface MemberManagementProps {
  data?: any[];
}

export default function MemberManagement({ data = [] }: MemberManagementProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (data && data.length > 0) {
      setMembers(data);
    }
  }, [data]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operasional/members');
      const result = await response.json();
      if (result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.id?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      active: 'Aktif',
      paid: 'Aktif',
      pending: 'Pending',
      expired: 'Kadaluarsa',
      suspended: 'Ditangguhkan'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Member</h2>
        <div className="flex space-x-3">
          <button 
            onClick={loadMembers}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Refresh
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium">
            + Tambah Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari nama atau ID member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="paid">Aktif</option>
          <option value="pending">Pending</option>
          <option value="expired">Kadaluarsa</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Member</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Membership</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Kunjungan Terakhir</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-gray-800">{member.nama}</div>
                    <div className="text-sm text-gray-600">ID: {member.id}</div>
                    <div className="text-xs text-gray-500">{member.telepon || member.phone || '-'}</div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-800">{member.membership_type || member.membershipType}</div>
                  <div className="text-xs text-gray-500">
                    Bergabung: {member.tanggal_daftar ? new Date(member.tanggal_daftar).toLocaleDateString('id-ID') : 
                              member.joinDate ? new Date(member.joinDate).toLocaleDateString('id-ID') : '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Expired: {member.masa_aktif ? new Date(member.masa_aktif).toLocaleDateString('id-ID') :
                            member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : '-'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                    {getStatusText(member.status)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-800">
                    {member.lastCheckin ? new Date(member.lastCheckin).toLocaleDateString('id-ID') : 
                     member.lastVisit ? new Date(member.lastVisit).toLocaleDateString('id-ID') : 'Belum pernah'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {member.totalVisits || 0} kunjungan
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Edit
                    </button>
                    <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                      Detail
                    </button>
                    {(member.status === 'active' || member.status === 'paid') && (
                      <button className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {members.length === 0 ? 'Tidak ada data member' : 'Tidak ada member yang sesuai dengan filter'}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-lg font-bold text-blue-600">{members.length}</div>
          <div className="text-xs text-blue-800">Total Member</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-bold text-green-600">
            {members.filter(m => m.status === 'active' || m.status === 'paid').length}
          </div>
          <div className="text-xs text-green-800">Aktif</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-lg font-bold text-yellow-600">
            {members.filter(m => m.status === 'pending').length}
          </div>
          <div className="text-xs text-yellow-800">Pending</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-lg font-bold text-red-600">
            {members.filter(m => m.status === 'expired').length}
          </div>
          <div className="text-xs text-red-800">Kadaluarsa</div>
        </div>
      </div>
    </div>
  );
}