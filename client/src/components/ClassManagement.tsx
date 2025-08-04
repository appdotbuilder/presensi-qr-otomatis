
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
import { Pencil, Trash2, RefreshCw, Plus } from 'lucide-react';
import type { Class, CreateClassInput, UpdateClassInput, User } from '../../../server/src/schema';

export function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [createForm, setCreateForm] = useState<CreateClassInput>({
    name: '',
    teacher_id: null
  });

  const [editForm, setEditForm] = useState<UpdateClassInput>({
    id: 0,
    name: '',
    teacher_id: null
  });

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [classesData, usersData] = await Promise.all([
        trpc.getClasses.query(),
        trpc.getUsers.query()
      ]);
      setClasses(classesData);
      // Filter only teachers
      const teacherUsers = usersData.filter((user: User) => user.role === 'teacher');
      setTeachers(teacherUsers);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newClass = await trpc.createClass.mutate(createForm);
      setClasses((prev: Class[]) => [...prev, newClass]);
      setShowCreateDialog(false);
      setCreateForm({ name: '', teacher_id: null });
    } catch (error) {
      console.error('Failed to create class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedClass = await trpc.updateClass.mutate(editForm);
      setClasses((prev: Class[]) => 
        prev.map((cls: Class) => cls.id === updatedClass.id ? updatedClass : cls)
      );
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to update class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini? Siswa di kelas ini akan terpengaruh.')) return;

    setIsLoading(true);
    try {
      await trpc.deleteClass.mutate(id);
      setClasses((prev: Class[]) => prev.filter((cls: Class) => cls.id !== id));
    } catch (error) {
      console.error('Failed to delete class:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (classData: Class) => {
    setEditForm({
      id: classData.id,
      name: classData.name,
      teacher_id: classData.teacher_id
    });
    setShowEditDialog(true);
  };

  const getTeacherName = (teacherId: number | null) => {
    if (!teacherId) return 'Belum ditentukan';
    const teacher = teachers.find((t: User) => t.id === teacherId);
    return teacher ? teacher.full_name : 'Guru tidak ditemukan';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏫 Manajemen Kelas</h2>
          <p className="text-gray-600">Kelola kelas dan penugasan guru wali kelas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadClasses} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kelas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>➕ Tambah Kelas Baru</DialogTitle>
                <DialogDescription>
                  Buat kelas baru dan tentukan guru wali kelas
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="class_name">Nama Kelas</Label>
                  <Input
                    id="class_name"
                    placeholder="Contoh: X IPA 1, VII A, dll"
                    value={createForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev: CreateClassInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher_id">Guru Wali Kelas (Opsional)</Label>
                  <Select 
                    value={createForm.teacher_id?.toString() || 'none'} 
                    onValueChange={(value: string) =>
                      setCreateForm((prev: CreateClassInput) => ({ 
                        ...prev, 
                        teacher_id: value === 'none' ? null : parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih guru wali kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum ditentukan</SelectItem>
                      {teachers.map((teacher: User) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        </div>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Daftar Kelas</CardTitle>
          <CardDescription>
            Total {classes.length} kelas terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Memuat data kelas...</span>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-6xl mb-4 block">🏫</span>
              <p className="text-lg font-medium">Belum ada kelas</p>
              <p className="text-sm">Tambah kelas baru untuk memulai</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Wali Kelas</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classData: Class) => (
                    <TableRow key={classData.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏫</span>
                          {classData.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {classData.teacher_id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              👨‍🏫 {getTeacherName(classData.teacher_id)}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline">Belum ditentukan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {classData.created_at.toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(classData)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClass(classData.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
            <DialogTitle>✏️ Edit Kelas</DialogTitle>
            <DialogDescription>
              Ubah informasi kelas dan penugasan wali kelas
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_class_name">Nama Kelas</Label>
              <Input
                id="edit_class_name"
                value={editForm.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateClassInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_teacher_id">Guru Wali Kelas</Label>
              <Select 
                value={editForm.teacher_id?.toString() || 'none'} 
                onValueChange={(value: string) =>
                  setEditForm((prev: UpdateClassInput) => ({ 
                    ...prev, 
                    teacher_id: value === 'none' ? null : parseInt(value) 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum ditentukan</SelectItem>
                  {teachers.map((teacher: User) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
            <span className="text-2xl">🏫</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">Kelas aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dengan Wali</CardTitle>
            <span className="text-2xl">👨‍🏫</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {classes.filter((cls: Class) => cls.teacher_id).length}
            </div>
            <p className="text-xs text-muted-foreground">Sudah ada wali kelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tanpa Wali</CardTitle>
            <span className="text-2xl">❓</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {classes.filter((cls: Class) => !cls.teacher_id).length}
            </div>
            <p className="text-xs text-muted-foreground">Belum ada wali kelas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
