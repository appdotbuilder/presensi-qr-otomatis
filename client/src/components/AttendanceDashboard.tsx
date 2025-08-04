
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import type { User, Attendance } from '../../../server/src/schema';

interface AttendanceDashboardProps {
  currentUser: User;
}

interface DailySummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
}

export function AttendanceDashboard({ currentUser }: AttendanceDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const loadDashboardData = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const [summary, attendance] = await Promise.all([
        trpc.getDailyAttendanceSummary.query(date),
        trpc.getAttendanceByDate.query(date)
      ]);
      setDailySummary(summary);
      setTodayAttendance(attendance);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(selectedDate);
  }, [selectedDate, loadDashboardData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(selectedDate);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard Presensi</h2>
          <p className="text-gray-600">
            Ringkasan presensi siswa untuk {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dailySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
              <span className="text-2xl">👥</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailySummary.total_students}</div>
              <p className="text-xs text-muted-foreground">Siswa terdaftar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hadir</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dailySummary.present}</div>
              <p className="text-xs text-muted-foreground">
                {dailySummary.total_students > 0 
                  ? `${Math.round((dailySummary.present / dailySummary.total_students) * 100)}%`
                  : '0%'
                } dari total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tidak Hadir</CardTitle>
              <span className="text-2xl">❌</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dailySummary.absent}</div>
              <p className="text-xs text-muted-foreground">
                {dailySummary.total_students > 0 
                  ? `${Math.round((dailySummary.absent / dailySummary.total_students) * 100)}%`
                  : '0%'
                } dari total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
              <span className="text-2xl">⏰</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{dailySummary.late}</div>
              <p className="text-xs text-muted-foreground">
                {dailySummary.total_students > 0 
                  ? `${Math.round((dailySummary.late / dailySummary.total_students) * 100)}%`
                  : '0%'
                } dari total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Presensi Hari Ini</CardTitle>
          <CardDescription>
            Daftar siswa yang sudah melakukan presensi pada {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Memuat data...</span>
            </div>
          ) : todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-6xl mb-4 block">📅</span>
              <p className="text-lg font-medium">Belum ada presensi</p>
              <p className="text-sm">Belum ada siswa yang melakukan presensi pada tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {todayAttendance.slice(0, 10).map((record: Attendance) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">🎓</span>
                      </div>
                      <div>
                        <p className="font-medium">Siswa ID: {record.student_id}</p>
                        <p className="text-sm text-gray-500">
                          Status: <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.check_in_time && (
                        <p className="text-sm text-green-600">
                          ✅ Masuk: {format(record.check_in_time, 'HH:mm')}
                        </p>
                      )}
                      {record.check_out_time && (
                        <p className="text-sm text-blue-600">
                          🚪 Keluar: {format(record.check_out_time, 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {todayAttendance.length > 10 && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Dan {todayAttendance.length - 10} presensi lainnya...
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welcome Message for Students */}
      {currentUser.role === 'student' && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">👋</span>
              Selamat datang, {currentUser.full_name}!
            </CardTitle>
            <CardDescription>
              Gunakan QR Code Anda untuk melakukan check-in dan check-out. 
              Pastikan untuk selalu melakukan presensi tepat waktu.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
