
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { QRScanInput, AttendanceStatus, Attendance } from '../../../server/src/schema';

export function QRScanner() {
  const [qrCode, setQrCode] = useState('');
  const [scanType, setScanType] = useState<AttendanceStatus>('check_in');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    attendance?: Attendance;
  } | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const scanInput: QRScanInput = {
        qr_code: qrCode.trim(),
        scan_type: scanType
      };

      const attendance = await trpc.processQRScan.mutate(scanInput);
      
      setResult({
        success: true,
        message: `✅ Presensi berhasil! Siswa telah ${scanType === 'check_in' ? 'check-in' : 'check-out'}.`,
        attendance
      });

      // Clear the QR code input for next scan
      setQrCode('');
    } catch (error) {
      console.error('QR scan failed:', error);
      setResult({
        success: false,
        message: '❌ QR Code tidak valid atau terjadi kesalahan. Silakan coba lagi.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInput = (value: string) => {
    setQrCode(value);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📱 QR Code Scanner</h2>
        <p className="text-gray-600">
          Scan QR code siswa untuk mencatat presensi masuk atau keluar
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner Form */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Scan QR Code</CardTitle>
            <CardDescription>
              Masukkan atau scan QR code siswa untuk mencatat kehadiran
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">QR Code</label>
                <Input
                  placeholder="Masukkan atau scan QR code..."
                  value={qrCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleManualInput(e.target.value)
                  }
                  required
                  disabled={isLoading}
                  className="text-center font-mono"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Arahkan kamera ke QR code atau ketik manual
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Presensi</label>
                <Select value={scanType} onValueChange={(value: AttendanceStatus) => setScanType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">🟢 Check In (Masuk)</SelectItem>
                    <SelectItem value="check_out">🔴 Check Out (Keluar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !qrCode.trim()}>
                {isLoading ? 'Memproses...' : `📷 ${scanType === 'check_in' ? 'Check In' : 'Check Out'}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result Display */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Hasil Scan</CardTitle>
            <CardDescription>
              Hasil dari proses scanning QR code akan ditampilkan di sini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <Alert variant={result.success ? 'default' : 'destructive'}>
                  <AlertDescription className="text-base">
                    {result.message}
                  </AlertDescription>
                </Alert>

                {result.success && result.attendance && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Detail Presensi:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Siswa ID:</span>
                        <span className="font-medium">{result.attendance.student_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tanggal:</span>
                        <span className="font-medium">
                          {result.attendance.date.toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="secondary">{result.attendance.status}</Badge>
                      </div>
                      {result.attendance.check_in_time && (
                        <div className="flex justify-between">
                          <span>Waktu Masuk:</span>
                          <span className="font-medium text-green-600">
                            {result.attendance.check_in_time.toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                      )}
                      {result.attendance.check_out_time && (
                        <div className="flex justify-between">
                          <span>Waktu Keluar:</span>
                          <span className="font-medium text-blue-600">
                            {result.attendance.check_out_time.toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-6xl mb-4 block">📱</span>
                <p className="text-lg font-medium">Siap untuk scan</p>
                <p className="text-sm">Masukkan QR code untuk memulai proses presensi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Aksi Cepat</CardTitle>
          <CardDescription>
            Shortcut untuk operasi yang sering digunakan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setScanType('check_in');
                setQrCode('');
                setResult(null);
              }}
            >
              <span className="text-2xl mb-1">🟢</span>
              <span className="text-xs">Mode Check-In</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setScanType('check_out');
                setQrCode('');
                setResult(null);
              }}
            >
              <span className="text-2xl mb-1">🔴</span>
              <span className="text-xs">Mode Check-Out</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setQrCode('');
                setResult(null);
              }}
            >
              <span className="text-2xl mb-1">🔄</span>
              <span className="text-xs">Reset Form</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => window.location.reload()}
            >
              <span className="text-2xl mb-1">🔃</span>
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">📋 Petunjuk Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Pilih jenis presensi (Check-In untuk masuk, Check-Out untuk keluar)</li>
            <li>Scan QR code siswa atau masukkan kode manual di field QR Code</li>
            <li>Klik tombol untuk memproses presensi</li>
            <li>Sistem akan otomatis mencatat waktu dan mengirim notifikasi WhatsApp ke orang tua</li>
            <li>Hasil scan akan ditampilkan di panel sebelah kanan</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs">
              <strong>💡 Tips:</strong> Pastikan QR code dalam kondisi baik dan tidak rusak. 
              Setiap siswa memiliki QR code unik yang tidak dapat digunakan oleh siswa lain.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
