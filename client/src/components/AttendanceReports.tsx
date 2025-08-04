
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, Download, FileText, RefreshCw } from 'lucide-react';
import type { User, Attendance, Student, Class, AttendanceReportFilter } from '../../../server/src/schema';

interface AttendanceReportsProps {
  currentUser: User;
  studentOnly?: boolean;
}

export function AttendanceReports({ studentOnly = false }: AttendanceReportsProps) {
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        trpc.getStudents.query(),
        trpc.getClasses.query()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter: AttendanceReportFilter = {
        ...(selectedStudent !== 'all' && { student_id: parseInt(selectedStudent) }),
        ...(selectedClass !== 'all' && { class_id: parseInt(selectedClass) }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      };

      const reportData = await trpc.getAttendanceReport.query(filter);
      setAttendanceData(reportData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent, selectedClass, startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    // Auto-generate report when filters change
    if (students.length > 0) {
      generateReport();
    }
  }, [generateReport, students.length]);

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setStartDateOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    setEndDateOpen(false);
  };

  const getStudentName = (studentId: number) => {
    const student = students.find((s: Student) => s.id === studentId);
    return student ? student.full_name : 'Siswa Tidak Diketahui';
  };

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter((a: Attendance) => a.status === 'present').length;
    const absent = attendanceData.filter((a: Attendance) => a.status === 'absent').length;
    const late = attendanceData.filter((a: Attendance) => a.status === 'late').length;

    return { total, present, absent, late };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            📈 {studentOnly ? 'Presensi Saya' : 'Laporan Presensi'}
          </h2>
          <p className="text-gray-600">
            {studentOnly 
              ? 'Lihat riwayat presensi Anda'
              : 'Generate dan analisis laporan presensi siswa'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateReport} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Memuat...' : 'Generate Laporan'}
          </Button>
          <Button variant="outline" disabled={attendanceData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!studentOnly && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Filter Laporan</CardTitle>
            <CardDescription>
              Atur filter untuk menghasilkan laporan yang diinginkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Mulai</label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Akhir</label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Siswa</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Siswa</SelectItem>
                    {students.map((student: Student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.full_name} ({student.student_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kelas</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classes.map((cls: Class) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Record</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total presensi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
            <span className="text-green-600">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : '0%'} dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidak Hadir</CardTitle>
            <span className="text-red-600">❌</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}%` : '0%'} dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <span className="text-yellow-600">⏰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}%` : '0%'} dari total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Detail Laporan</CardTitle>
          <CardDescription>
            {attendanceData.length} record presensi ditemukan
            {startDate && ` dari ${format(startDate, 'dd MMM yyyy', { locale: id })}`}
            {endDate && ` sampai ${format(endDate, 'dd MMM yyyy', { locale: id })}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Memuat laporan...</span>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-lg font-medium">Tidak ada data presensi</p>
              <p className="text-sm">Coba ubah filter atau periode tanggal</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    {!studentOnly && <TableHead>Siswa</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((record: Attendance) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(record.date, 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      {!studentOnly && (
                        <TableCell className="font-medium">
                          {getStudentName(record.student_id)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge 
                          variant={
                            record.status === 'present' ? 'default' : 
                            record.status === 'late' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {record.status === 'present' ? '✅ Hadir' :
                           record.status === 'late' ? '⏰ Terlambat' :
                           record.status === 'absent' ? '❌ Tidak Hadir' :
                           record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.check_in_time ? (
                          <span className="text-green-600">
                            {format(record.check_in_time, 'HH:mm')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.check_out_time ? (
                          <span className="text-blue-600">
                            {format(record.check_out_time, 'HH:mm')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.notes ? (
                          <span className="text-sm text-gray-600">{record.notes}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
