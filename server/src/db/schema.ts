
import { serial, text, pgTable, timestamp, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Classes table
export const classesTable = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  teacher_id: integer('teacher_id').references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  student_number: text('student_number').notNull().unique(),
  full_name: text('full_name').notNull(),
  class_id: integer('class_id').notNull().references(() => classesTable.id),
  parent_whatsapp: text('parent_whatsapp').notNull(),
  qr_code: text('qr_code').notNull().unique(),
  user_id: integer('user_id').references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  date: date('date').notNull(),
  check_in_time: timestamp('check_in_time'),
  check_out_time: timestamp('check_out_time'),
  status: text('status').notNull().default('absent'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => studentsTable.id),
  message: text('message').notNull(),
  whatsapp_number: text('whatsapp_number').notNull(),
  sent_at: timestamp('sent_at'),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  classes: many(classesTable),
  student: one(studentsTable, {
    fields: [usersTable.id],
    references: [studentsTable.user_id]
  })
}));

export const classesRelations = relations(classesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [classesTable.teacher_id],
    references: [usersTable.id]
  }),
  students: many(studentsTable)
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  class: one(classesTable, {
    fields: [studentsTable.class_id],
    references: [classesTable.id]
  }),
  user: one(usersTable, {
    fields: [studentsTable.user_id],
    references: [usersTable.id]
  }),
  attendance: many(attendanceTable),
  notifications: many(notificationsTable)
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [attendanceTable.student_id],
    references: [studentsTable.id]
  })
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [notificationsTable.student_id],
    references: [studentsTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  classes: classesTable,
  students: studentsTable,
  attendance: attendanceTable,
  notifications: notificationsTable
};
