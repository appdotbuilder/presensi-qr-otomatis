
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { StudentManagement } from '@/components/StudentManagement';
import { QRScanner } from '@/components/QRScanner';
import { AttendanceReports } from '@/components/AttendanceReports';
import { ClassManagement } from '@/components/ClassManagement';
import { UserManagement } from '@/components/UserManagement';
import { AttendanceDashboard } from '@/components/AttendanceDashboard';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Check for existing auth token on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyExistingToken(token);
    }
  }, []);

  const verifyExistingToken = async (token: string) => {
    try {
      const user = await trpc.verifyToken.query(token);
      if (user) {
        setCurrentUser(user);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
    }
  };

  const handleLogin = useCallback((user: User, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('auth_token', token);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    setCurrentTab('dashboard');
  }, []);

  // Show login form if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Sistem Presensi Siswa</h1>
            <p className="text-gray-600">Sistem presensi otomatis berbasis QR Code</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  // Determine available tabs based on user role
  const getAvailableTabs = () => {
    const baseTabs = [
      { id: 'dashboard', label: '📊 Dashboard', roles: ['admin', 'teacher', 'student'] },
      { id: 'scanner', label: '📱 QR Scanner', roles: ['admin', 'teacher'] },
    ];

    const adminTabs = [
      { id: 'students', label: '👥 Manajemen Siswa', roles: ['admin', 'teacher'] },
      { id: 'classes', label: '🏫 Manajemen Kelas', roles: ['admin'] },
      { id: 'users', label: '👤 Manajemen Pengguna', roles: ['admin'] },
      { id: 'reports', label: '📈 Laporan', roles: ['admin', 'teacher'] },
    ];

    const studentTabs = [
      { id: 'my-attendance', label: '📅 Presensi Saya', roles: ['student'] },
    ];

    return [...baseTabs, ...adminTabs, ...studentTabs].filter(tab => 
      tab.roles.includes(currentUser.role)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">📚 Sistem Presensi Siswa</h1>
              <Badge variant="secondary" className="capitalize">
                {currentUser.role === 'admin' ? '👑 Admin' : 
                 currentUser.role === 'teacher' ? '👨‍🏫 Guru' : '🎓 Siswa'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Selamat datang, <span className="font-medium">{currentUser.full_name}</span>
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
            {getAvailableTabs().map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AttendanceDashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="scanner" className="space-y-6">
            <QRScanner />
          </TabsContent>

          {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
            <TabsContent value="students" className="space-y-6">
              <StudentManagement currentUser={currentUser} />
            </TabsContent>
          )}

          {currentUser.role === 'admin' && (
            <TabsContent value="classes" className="space-y-6">
              <ClassManagement />
            </TabsContent>
          )}

          {currentUser.role === 'admin' && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
            <TabsContent value="reports" className="space-y-6">
              <AttendanceReports currentUser={currentUser} />
            </TabsContent>
          )}

          {currentUser.role === 'student' && (
            <TabsContent value="my-attendance" className="space-y-6">
              <AttendanceReports currentUser={currentUser} studentOnly={true} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
