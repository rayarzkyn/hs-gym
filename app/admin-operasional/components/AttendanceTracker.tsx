'use client';
import { useState, useEffect } from 'react';

interface AttendanceTrackerProps {
  data?: any[];
  detailed?: boolean;
}

export default function AttendanceTracker({ data = [], detailed = false }: AttendanceTrackerProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      setAttendance(data);
    } else {
      loadAttendance();
    }
  }, [data]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operasional/attendance');
      const result = await response.json();
      if (result.success) {
        setAttendance(result.data);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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

  const todayAttendees = attendance.filter(a => {
    if (!a.checkIn) return false;
    return new Date(a.checkIn).toDateString() === new Date().toDateString();
  });

  // Untuk current attendees, kita asumsikan yang check-in hari ini tanpa check-out
  const currentAttendees = todayAttendees.filter(a => !a.checkOut);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Tracker Presensi</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-green-600">{currentAttendees.length}</span> sedang berolahraga
          </div>
          <button
            onClick={loadAttendance}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Current Attendees */}
      {currentAttendees.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Sedang Berolahraga</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentAttendees.map((attendee) => (
              <div
                key={attendee.id}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-green-800">{attendee.memberName}</div>
                    <div className="text-sm text-green-600">
                      Check-in: {formatTime(attendee.checkIn)}
                    </div>
                    <div className="text-xs text-green-500 mt-1">
                      {attendee.type === 'member' ? '🎯 Member' : '👤 Non-Member'}
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Attendance List */}
      {detailed ? (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Presensi Hari Ini ({todayAttendees.length} orang)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todayAttendees.map((attendee) => (
              <div
                key={attendee.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    attendee.checkOut ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-800">{attendee.memberName}</div>
                    <div className="text-sm text-gray-600">
                      {attendee.type === 'member' ? '🎯 Member' : '👤 Non-Member'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {formatTime(attendee.checkIn)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(attendee.checkIn)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📊</div>
          <p>Gunakan tab "Presensi" untuk melihat detail lengkap</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-lg font-bold text-blue-600">{todayAttendees.length}</div>
          <div className="text-xs text-blue-800">Total Hari Ini</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-bold text-green-600">
            {todayAttendees.filter(a => a.type === 'member').length}
          </div>
          <div className="text-xs text-green-800">Member</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-lg font-bold text-orange-600">
            {todayAttendees.filter(a => a.type === 'non-member').length}
          </div>
          <div className="text-xs text-orange-800">Non-Member</div>
        </div>
      </div>
    </div>
  );
}