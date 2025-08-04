
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, studentsTable, attendanceTable, notificationsTable } from '../db/schema';
import { type CreateAttendanceInput, type UpdateAttendanceInput, type QRScanInput, type AttendanceReportFilter } from '../schema';
import {
  createAttendance,
  processQRScan,
  getAttendanceByDate,
  getAttendanceByStudent,
  getAttendanceReport,
  updateAttendance,
  getDailyAttendanceSummary
} from '../handlers/attendance';
import { eq, and } from 'drizzle-orm';

describe('Attendance Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let classId: number;
  let studentId: number;
  let student2Id: number;

  beforeEach(async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        username: 'teacher1',
        password: 'password123',
        full_name: 'Teacher One',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    // Create class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Class 1A',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    classId = classResult[0].id;

    // Create students
    const studentResult = await db.insert(studentsTable)
      .values({
        student_number: 'STU001',
        full_name: 'John Doe',
        class_id: classId,
        parent_whatsapp: '+1234567890',
        qr_code: 'QR001'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    const student2Result = await db.insert(studentsTable)
      .values({
        student_number: 'STU002',
        full_name: 'Jane Smith',
        class_id: classId,
        parent_whatsapp: '+1234567891',
        qr_code: 'QR002'
      })
      .returning()
      .execute();
    student2Id = student2Result[0].id;
  });

  describe('createAttendance', () => {
    it('should create attendance record', async () => {
      const input: CreateAttendanceInput = {
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: 'On time'
      };

      const result = await createAttendance(input);

      expect(result.student_id).toEqual(studentId);
      expect(result.date).toEqual(new Date('2024-01-15'));
      expect(result.check_in_time).toEqual(new Date('2024-01-15T08:00:00Z'));
      expect(result.check_out_time).toBeNull();
      expect(result.status).toEqual('present');
      expect(result.notes).toEqual('On time');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save attendance to database', async () => {
      const input: CreateAttendanceInput = {
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      };

      const result = await createAttendance(input);

      const saved = await db.select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, result.id))
        .execute();

      expect(saved).toHaveLength(1);
      expect(saved[0].student_id).toEqual(studentId);
      expect(saved[0].status).toEqual('present');
      expect(saved[0].date).toEqual('2024-01-15'); // Database stores as string
    });

    it('should throw error for non-existent student', async () => {
      const input: CreateAttendanceInput = {
        student_id: 99999,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      };

      await expect(createAttendance(input)).rejects.toThrow(/Student with ID 99999 not found/);
    });
  });

  describe('processQRScan', () => {
    it('should process check-in QR scan', async () => {
      const input: QRScanInput = {
        qr_code: 'QR001',
        scan_type: 'check_in'
      };

      const result = await processQRScan(input);

      expect(result.student_id).toEqual(studentId);
      expect(result.check_in_time).toBeInstanceOf(Date);
      expect(result.check_out_time).toBeNull();
      expect(result.status).toEqual('present');
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should process check-out QR scan', async () => {
      // First check in
      await processQRScan({
        qr_code: 'QR001',
        scan_type: 'check_in'
      });

      // Then check out
      const result = await processQRScan({
        qr_code: 'QR001',
        scan_type: 'check_out'
      });

      expect(result.student_id).toEqual(studentId);
      expect(result.check_in_time).toBeInstanceOf(Date);
      expect(result.check_out_time).toBeInstanceOf(Date);
      expect(result.status).toEqual('checked_out');
    });

    it('should create WhatsApp notification', async () => {
      const input: QRScanInput = {
        qr_code: 'QR001',
        scan_type: 'check_in'
      };

      await processQRScan(input);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.student_id, studentId))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toMatch(/John Doe has checked in at/);
      expect(notifications[0].whatsapp_number).toEqual('+1234567890');
      expect(notifications[0].status).toEqual('pending');
    });

    it('should throw error for invalid QR code', async () => {
      const input: QRScanInput = {
        qr_code: 'INVALID',
        scan_type: 'check_in'
      };

      await expect(processQRScan(input)).rejects.toThrow(/Student with QR code INVALID not found/);
    });

    it('should throw error for check-out without check-in', async () => {
      const input: QRScanInput = {
        qr_code: 'QR001',
        scan_type: 'check_out'
      };

      await expect(processQRScan(input)).rejects.toThrow(/Cannot check out without checking in first/);
    });
  });

  describe('getAttendanceByDate', () => {
    it('should get attendance records for specific date', async () => {
      const date = new Date('2024-01-15');
      
      // Create attendance records
      await createAttendance({
        student_id: studentId,
        date,
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: student2Id,
        date,
        check_in_time: new Date('2024-01-15T08:30:00Z'),
        check_out_time: null,
        status: 'late',
        notes: null
      });

      const result = await getAttendanceByDate(date);

      expect(result).toHaveLength(2);
      expect(result[0].student_id).toEqual(studentId);
      expect(result[1].student_id).toEqual(student2Id);
      expect(result[0].date).toEqual(date);
    });

    it('should return empty array for date with no attendance', async () => {
      const result = await getAttendanceByDate(new Date('2024-01-20'));
      expect(result).toHaveLength(0);
    });
  });

  describe('getAttendanceByStudent', () => {
    it('should get attendance records for specific student', async () => {
      // Create multiple attendance records
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-16'),
        check_in_time: new Date('2024-01-16T08:30:00Z'),
        check_out_time: null,
        status: 'late',
        notes: null
      });

      const result = await getAttendanceByStudent(studentId);

      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(new Date('2024-01-16')); // Most recent first
      expect(result[1].date).toEqual(new Date('2024-01-15'));
    });

    it('should filter by date range', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-10'),
        check_in_time: new Date('2024-01-10T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      const result = await getAttendanceByStudent(
        studentId,
        new Date('2024-01-12'),
        new Date('2024-01-20')
      );

      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(new Date('2024-01-15'));
    });

    it('should throw error for non-existent student', async () => {
      await expect(getAttendanceByStudent(99999)).rejects.toThrow(/Student with ID 99999 not found/);
    });
  });

  describe('getAttendanceReport', () => {
    it('should get report filtered by student', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: student2Id,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:30:00Z'),
        check_out_time: null,
        status: 'late',
        notes: null
      });

      const filter: AttendanceReportFilter = { student_id: studentId };
      const result = await getAttendanceReport(filter);

      expect(result).toHaveLength(1);
      expect(result[0].student_id).toEqual(studentId);
    });

    it('should get report filtered by class', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      const filter: AttendanceReportFilter = { class_id: classId };
      const result = await getAttendanceReport(filter);

      expect(result).toHaveLength(1);
      expect(result[0].student_id).toEqual(studentId);
    });

    it('should get report filtered by date range', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-10'),
        check_in_time: new Date('2024-01-10T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-20'),
        check_in_time: new Date('2024-01-20T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      const filter: AttendanceReportFilter = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-25')
      };
      const result = await getAttendanceReport(filter);

      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(new Date('2024-01-20'));
    });

    it('should get report with multiple filters', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: student2Id,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:30:00Z'),
        check_out_time: null,
        status: 'late',
        notes: null
      });

      const filter: AttendanceReportFilter = { 
        class_id: classId,
        start_date: new Date('2024-01-14'),
        end_date: new Date('2024-01-16')
      };
      const result = await getAttendanceReport(filter);

      expect(result).toHaveLength(2);
      expect(result.every(r => r.date.getTime() === new Date('2024-01-15').getTime())).toBe(true);
    });

    it('should get all records when no filters provided', async () => {
      await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: student2Id,
        date: new Date('2024-01-16'),
        check_in_time: new Date('2024-01-16T08:30:00Z'),
        check_out_time: null,
        status: 'late',
        notes: null
      });

      const filter: AttendanceReportFilter = {};
      const result = await getAttendanceReport(filter);

      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(new Date('2024-01-16')); // Most recent first
      expect(result[1].date).toEqual(new Date('2024-01-15'));
    });
  });

  describe('updateAttendance', () => {
    it('should update attendance record', async () => {
      const attendance = await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: null
      });

      const input: UpdateAttendanceInput = {
        id: attendance.id,
        check_out_time: new Date('2024-01-15T16:00:00Z'),
        status: 'checked_out',
        notes: 'Left early'
      };

      const result = await updateAttendance(input);

      expect(result.id).toEqual(attendance.id);
      expect(result.check_out_time).toEqual(new Date('2024-01-15T16:00:00Z'));
      expect(result.status).toEqual('checked_out');
      expect(result.notes).toEqual('Left early');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update only specified fields', async () => {
      const attendance = await createAttendance({
        student_id: studentId,
        date: new Date('2024-01-15'),
        check_in_time: new Date('2024-01-15T08:00:00Z'),
        check_out_time: null,
        status: 'present',
        notes: 'Original note'
      });

      const input: UpdateAttendanceInput = {
        id: attendance.id,
        status: 'late'
      };

      const result = await updateAttendance(input);

      expect(result.status).toEqual('late');
      expect(result.notes).toEqual('Original note'); // Should remain unchanged
      expect(result.check_in_time).toEqual(new Date('2024-01-15T08:00:00Z')); // Should remain unchanged
    });

    it('should throw error for non-existent attendance record', async () => {
      const input: UpdateAttendanceInput = {
        id: 99999,
        status: 'present'
      };

      await expect(updateAttendance(input)).rejects.toThrow(/Attendance record with ID 99999 not found/);
    });
  });

  describe('getDailyAttendanceSummary', () => {
    it('should calculate daily attendance summary', async () => {
      const date = new Date('2024-01-15');

      // Create attendance records - one present, one late
      await createAttendance({
        student_id: studentId,
        date,
        check_in_time: new Date('2024-01-15T07:30:00Z'), // Early (present)
        check_out_time: null,
        status: 'present',
        notes: null
      });

      await createAttendance({
        student_id: student2Id,
        date,
        check_in_time: new Date('2024-01-15T08:30:00Z'), // Late
        check_out_time: null,
        status: 'present',
        notes: null
      });

      const result = await getDailyAttendanceSummary(date);

      expect(result.total_students).toEqual(2);
      expect(result.present).toEqual(1);
      expect(result.late).toEqual(1);
      expect(result.absent).toEqual(0);
    });

    it('should handle no attendance records', async () => {
      const result = await getDailyAttendanceSummary(new Date('2024-01-20'));

      expect(result.total_students).toEqual(2); // Still have 2 students
      expect(result.present).toEqual(0);
      expect(result.late).toEqual(0);
      expect(result.absent).toEqual(2);
    });

    it('should handle mixed attendance statuses', async () => {
      const date = new Date('2024-01-15');

      // Create one attendance record for student1, none for student2
      await createAttendance({
        student_id: studentId,
        date,
        check_in_time: new Date('2024-01-15T07:45:00Z'),
        check_out_time: new Date('2024-01-15T15:30:00Z'),
        status: 'checked_out',
        notes: null
      });

      const result = await getDailyAttendanceSummary(date);

      expect(result.total_students).toEqual(2);
      expect(result.present).toEqual(1); // One student checked out (counts as present)
      expect(result.late).toEqual(0);
      expect(result.absent).toEqual(1); // One student has no record
    });
  });
});
