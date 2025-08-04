
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { Pencil, Trash2, QrCode, RefreshCw, Plus, Search } from 'lucide-react';
import type { User, Student, CreateStudentInput, UpdateStudentInput, Class } from '../../../server/src/schema';

interface StudentManagementProps {
  currentUser: User;
}

export function StudentManagement({ currentUser }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [createForm, setCreateForm] = useState<CreateStudentInput>({
    student_number: '',
    full_name: '',
    class_id: 0,
    parent_whatsapp: '',
    user_id: null
  });

  const [editForm, setEditForm] = useState<UpdateStudentInput>({
    id: 0,
    student_number: '',
    full_name: '',
    class_id: 0,
    parent_whatsapp: '',
    user_id: null
  });

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        trpc.getStudents.query(),
        trpc.getClasses.query()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newStudent = await trpc.createStudent.mutate(createForm);
      setStudents((prev: Student[]) => [...prev, newStudent]);
      setShowCreateDialog(false);
      setCreateForm({
        student_number: '',
        full_name: '',
        class_id: 0,
        parent_whatsapp: '',
        user_id: null
      });
    } catch (error) {
      console.error('Failed to create student:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedStudent = await trpc.updateStudent.mutate(editForm);
      setStudents((prev: Student[]) => 
        prev.map((s: Student) => s.id === updatedStudent.id ? updatedStudent : s)
      );
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to update student:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;

    setIsLoading(true);
    try {
      await trpc.deleteStudent.mutate(id);
      setStudents((prev: Student[]) => prev.filter((s: Student) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete student:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateQR = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membuat QR Code baru untuk siswa ini?')) return;

    setIsLoading(true);
    try {
      const result = await trpc.regenerateQRCode.mutate(id);
      setStudents((prev: Student[]) => 
        prev.map((s: Student) => s.id === id ? { ...s, qr_code: result.qr_code } : s)
      );
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (student: Student) => {
    setEditForm({
      id: student.id,
      student_number: student.student_number,
      full_name: student.full_name,
      class_id: student.class_id,
      parent_whatsapp: student.parent_whatsapp,
      user_id: student.user_id
    });
    setShowEditDialog(true);
  };

  const filteredStudents = students.filter((student: Student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.class_id.toString() === selectedClass;
    return matchesSearch && matchesClass;
  });

  const getClassName = (classId: number) => {
    const classData = classes.find((c: Class) => c.id === classId);
    return classData ? classData.name : 'Kelas Tidak Diketahui';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Manajemen Siswa</h2>
          <p className="text-gray-600">Kelola data siswa dan QR code presensi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadStudents} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {currentUser.role === 'admin' && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Siswa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>➕ Tambah Siswa Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan data siswa baru. QR Code akan dibuat otomatis.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_number">Nomor Induk Siswa</Label>
                    <Input
                      id="student_number"
                      placeholder="Contoh: 2024001"
                      value={createForm.student_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateStudentInput) => ({ ...prev, student_number: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nama Lengkap</Label>
                    <Input
                      id="full_name"
                      placeholder="Nama lengkap siswa"
                      value={createForm.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateStudentInput) => ({ ...prev, full_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class_id">Kelas</Label>
                    <Select 
                      value={createForm.class_id.toString()} 
                      onValueChange={(value: string) =>
                        setCreateForm((prev: CreateStudentInput) => ({ ...prev, class_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls: Class) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_whatsapp">WhatsApp Orang Tua</Label>
                    <Input
                      id="parent_whatsapp"
                      placeholder="Contoh: 08123456789"
                      value={createForm.parent_whatsapp}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateStudentInput) => ({ ...prev, parent_whatsapp: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Siswa</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari berdasarkan nama atau nomor induk..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="class-filter">Filter Kelas</Label>
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

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Daftar Siswa</CardTitle>
          <CardDescription>
            Total {filteredStudents.length} siswa {selectedClass !== 'all' && `di kelas ${getClassName(parseInt(selectedClass))}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Memuat data siswa...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-6xl mb-4 block">🎓</span>
              <p className="text-lg font-medium">Tidak ada siswa ditemukan</p>
              <p className="text-sm">
                {searchTerm || selectedClass !== 'all' ? 'Coba ubah filter pencarian' : 'Tambah siswa baru untuk memulai'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>WhatsApp Ortu</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.student_number}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getClassName(student.class_id)}</Badge>
                      </TableCell>
                      <TableCell>{student.parent_whatsapp}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {student.qr_code.substring(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(student)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateQR(student.id)}
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>
                          {currentUser.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Edit Data Siswa</DialogTitle>
            <DialogDescription>
              Ubah informasi siswa. Pastikan data yang dimasukkan benar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_student_number">Nomor Induk Siswa</Label>
              <Input
                id="edit_student_number"
                value={editForm.student_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateStudentInput) => ({ ...prev, student_number: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Nama Lengkap</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateStudentInput) => ({ ...prev, full_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_class_id">Kelas</Label>
              <Select 
                value={editForm.class_id?.toString() || ''} 
                onValueChange={(value: string) =>
                  setEditForm((prev: UpdateStudentInput) => ({ ...prev, class_id: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: Class) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_parent_whatsapp">WhatsApp Orang Tua</Label>
              <Input
                id="edit_parent_whatsapp"
                value={editForm.parent_whatsapp || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateStudentInput) => ({ ...prev, parent_whatsapp: e.target.value }))
                }
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
