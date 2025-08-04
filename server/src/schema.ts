
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['admin', 'teacher', 'student']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().min(1).optional(),
  role: userRoleSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Login schema
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Class schema
export const classSchema = z.object({
  id: z.number(),
  name: z.string(),
  teacher_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Class = z.infer<typeof classSchema>;

// Class input schemas
export const createClassInputSchema = z.object({
  name: z.string().min(1),
  teacher_id: z.number().nullable()
});

export type CreateClassInput = z.infer<typeof createClassInputSchema>;

export const updateClassInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  teacher_id: z.number().nullable().optional()
});

export type UpdateClassInput = z.infer<typeof updateClassInputSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  student_number: z.string(),
  full_name: z.string(),
  class_id: z.number(),
  parent_whatsapp: z.string(),
  qr_code: z.string(),
  user_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Student input schemas
export const createStudentInputSchema = z.object({
  student_number: z.string().min(1),
  full_name: z.string().min(1),
  class_id: z.number(),
  parent_whatsapp: z.string().min(10),
  user_id: z.number().nullable()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const updateStudentInputSchema = z.object({
  id: z.number(),
  student_number: z.string().min(1).optional(),
  full_name: z.string().min(1).optional(),
  class_id: z.number().optional(),
  parent_whatsapp: z.string().min(10).optional(),
  user_id: z.number().nullable().optional()
});

export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

// Attendance status enum
export const attendanceStatusSchema = z.enum(['check_in', 'check_out']);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  date: z.coerce.date(),
  check_in_time: z.coerce.date().nullable(),
  check_out_time: z.coerce.date().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Attendance input schemas
export const createAttendanceInputSchema = z.object({
  student_id: z.number(),
  date: z.coerce.date(),
  check_in_time: z.coerce.date().nullable(),
  check_out_time: z.coerce.date().nullable(),
  status: z.string(),
  notes: z.string().nullable()
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceInputSchema>;

export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  check_in_time: z.coerce.date().nullable().optional(),
  check_out_time: z.coerce.date().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// QR Code scan input
export const qrScanInputSchema = z.object({
  qr_code: z.string(),
  scan_type: attendanceStatusSchema
});

export type QRScanInput = z.infer<typeof qrScanInputSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  message: z.string(),
  whatsapp_number: z.string(),
  sent_at: z.coerce.date().nullable(),
  status: z.string(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

// Report filters
export const attendanceReportFilterSchema = z.object({
  student_id: z.number().optional(),
  class_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type AttendanceReportFilter = z.infer<typeof attendanceReportFilterSchema>;
