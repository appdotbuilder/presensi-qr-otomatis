
import { db } from '../db';
import { attendanceTable, studentsTable, classesTable, notificationsTable } from '../db/schema';
import { type CreateAttendanceInput, type UpdateAttendanceInput, type Attendance, type QRScanInput, type AttendanceReportFilter } from '../schema';
import { eq, and, gte, lte, SQL, desc, asc } from 'drizzle-orm';

// Helper function to format date as string for date column
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to convert database result to Attendance type
function convertToAttendance(dbRow: any): Attendance {
  return {
    ...dbRow,
    date: new Date(dbRow.date), // Convert string date back to Date
  };
}

export async function createAttendance(input: CreateAttendanceInput): Promise<Attendance> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${input.student_id} not found`);
    }

    const result = await db.insert(attendanceTable)
      .values({
        student_id: input.student_id,
        date: formatDateString(input.date),
        check_in_time: input.check_in_time,
        check_out_time: input.check_out_time,
        status: input.status,
        notes: input.notes
      })
      .returning()
      .execute();

    return convertToAttendance(result[0]);
  } catch (error) {
    console.error('Attendance creation failed:', error);
    throw error;
  }
}

export async function processQRScan(input: QRScanInput): Promise<Attendance> {
  try {
    // Find student by QR code
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.qr_code, input.qr_code))
      .execute();

    if (students.length === 0) {
      throw new Error(`Student with QR code ${input.qr_code} not found`);
    }

    const student = students[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = formatDateString(today);

    // Check if attendance record exists for today
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, student.id),
        eq(attendanceTable.date, todayString)
      ))
      .execute();

    let attendanceRecord: any;
    const now = new Date();

    if (existingAttendance.length > 0) {
      // Update existing record
      const current = existingAttendance[0];
      
      if (input.scan_type === 'check_in' && !current.check_in_time) {
        const result = await db.update(attendanceTable)
          .set({
            check_in_time: now,
            status: 'present',
            updated_at: now
          })
          .where(eq(attendanceTable.id, current.id))
          .returning()
          .execute();
        attendanceRecord = result[0];
      } else if (input.scan_type === 'check_out' && current.check_in_time && !current.check_out_time) {
        const result = await db.update(attendanceTable)
          .set({
            check_out_time: now,
            status: 'checked_out',
            updated_at: now
          })
          .where(eq(attendanceTable.id, current.id))
          .returning()
          .execute();
        attendanceRecord = result[0];
      } else {
        throw new Error(`Invalid scan type ${input.scan_type} for current attendance state`);
      }
    } else {
      // Create new record
      if (input.scan_type !== 'check_in') {
        throw new Error('Cannot check out without checking in first');
      }

      const result = await db.insert(attendanceTable)
        .values({
          student_id: student.id,
          date: todayString,
          check_in_time: now,
          check_out_time: null,
          status: 'present',
          notes: null
        })
        .returning()
        .execute();
      attendanceRecord = result[0];
    }

    // Create WhatsApp notification
    const message = input.scan_type === 'check_in' 
      ? `${student.full_name} has checked in at ${now.toLocaleTimeString()}`
      : `${student.full_name} has checked out at ${now.toLocaleTimeString()}`;

    await db.insert(notificationsTable)
      .values({
        student_id: student.id,
        message,
        whatsapp_number: student.parent_whatsapp,
        status: 'pending'
      })
      .execute();

    return convertToAttendance(attendanceRecord);
  } catch (error) {
    console.error('QR scan processing failed:', error);
    throw error;
  }
}

export async function getAttendanceByDate(date: Date): Promise<Attendance[]> {
  try {
    const dateString = formatDateString(date);
    
    const result = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.date, dateString))
      .orderBy(asc(attendanceTable.student_id))
      .execute();

    return result.map(convertToAttendance);
  } catch (error) {
    console.error('Get attendance by date failed:', error);
    throw error;
  }
}

export async function getAttendanceByStudent(studentId: number, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    const conditions: SQL<unknown>[] = [eq(attendanceTable.student_id, studentId)];

    if (startDate) {
      conditions.push(gte(attendanceTable.date, formatDateString(startDate)));
    }

    if (endDate) {
      conditions.push(lte(attendanceTable.date, formatDateString(endDate)));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const result = await db.select()
      .from(attendanceTable)
      .where(whereClause)
      .orderBy(desc(attendanceTable.date))
      .execute();

    return result.map(convertToAttendance);
  } catch (error) {
    console.error('Get attendance by student failed:', error);
    throw error;
  }
}

export async function getAttendanceReport(filter: AttendanceReportFilter): Promise<Attendance[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filter.student_id) {
      conditions.push(eq(attendanceTable.student_id, filter.student_id));
    }

    if (filter.start_date) {
      conditions.push(gte(attendanceTable.date, formatDateString(filter.start_date)));
    }

    if (filter.end_date) {
      conditions.push(lte(attendanceTable.date, formatDateString(filter.end_date)));
    }

    // Handle class filter with join
    if (filter.class_id) {
      const classConditions: SQL<unknown>[] = [...conditions];
      classConditions.push(eq(studentsTable.class_id, filter.class_id));

      const whereClause = classConditions.length === 1 ? classConditions[0] : and(...classConditions);

      const result = await db.select({
        id: attendanceTable.id,
        student_id: attendanceTable.student_id,
        date: attendanceTable.date,
        check_in_time: attendanceTable.check_in_time,
        check_out_time: attendanceTable.check_out_time,
        status: attendanceTable.status,
        notes: attendanceTable.notes,
        created_at: attendanceTable.created_at,
        updated_at: attendanceTable.updated_at
      })
      .from(attendanceTable)
      .innerJoin(studentsTable, eq(attendanceTable.student_id, studentsTable.id))
      .where(whereClause)
      .orderBy(desc(attendanceTable.date), asc(attendanceTable.student_id))
      .execute();

      return result.map((row: any) => convertToAttendance({
        id: row.id,
        student_id: row.student_id,
        date: row.date,
        check_in_time: row.check_in_time,
        check_out_time: row.check_out_time,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } else {
      // Simple query without join
      if (conditions.length === 0) {
        const result = await db.select()
          .from(attendanceTable)
          .orderBy(desc(attendanceTable.date), asc(attendanceTable.student_id))
          .execute();
        return result.map(convertToAttendance);
      } else {
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
        const result = await db.select()
          .from(attendanceTable)
          .where(whereClause)
          .orderBy(desc(attendanceTable.date), asc(attendanceTable.student_id))
          .execute();
        return result.map(convertToAttendance);
      }
    }
  } catch (error) {
    console.error('Get attendance report failed:', error);
    throw error;
  }
}

export async function updateAttendance(input: UpdateAttendanceInput): Promise<Attendance> {
  try {
    // Verify attendance record exists
    const existing = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Attendance record with ID ${input.id} not found`);
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (input.check_in_time !== undefined) {
      updateData.check_in_time = input.check_in_time;
    }

    if (input.check_out_time !== undefined) {
      updateData.check_out_time = input.check_out_time;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const result = await db.update(attendanceTable)
      .set(updateData)
      .where(eq(attendanceTable.id, input.id))
      .returning()
      .execute();

    return convertToAttendance(result[0]);
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
}

export async function getDailyAttendanceSummary(date: Date): Promise<{
  total_students: number;
  present: number;
  absent: number;
  late: number;
}> {
  try {
    // Get all students count
    const totalStudentsResult = await db.select()
      .from(studentsTable)
      .execute();

    const totalStudents = totalStudentsResult.length;

    // Get attendance records for the date
    const dateString = formatDateString(date);
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.date, dateString))
      .execute();

    let present = 0;
    let late = 0;

    attendanceRecords.forEach(record => {
      if (record.status === 'present' || record.status === 'checked_out') {
        // Consider late if check-in is after 8:00 AM
        if (record.check_in_time) {
          const checkInHour = record.check_in_time.getHours();
          if (checkInHour >= 8) {
            late++;
          } else {
            present++;
          }
        } else {
          present++;
        }
      }
    });

    const absent = totalStudents - present - late;

    return {
      total_students: totalStudents,
      present,
      absent: Math.max(0, absent), // Ensure non-negative
      late
    };
  } catch (error) {
    console.error('Get daily attendance summary failed:', error);
    throw error;
  }
}
