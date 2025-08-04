
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema, 
  updateUserInputSchema,
  createClassInputSchema,
  updateClassInputSchema,
  createStudentInputSchema,
  updateStudentInputSchema,
  createAttendanceInputSchema,
  updateAttendanceInputSchema,
  qrScanInputSchema,
  attendanceReportFilterSchema
} from './schema';

// Import handlers
import { login, verifyToken } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from './handlers/users';
import { createClass, getClasses, getClassById, updateClass, deleteClass } from './handlers/classes';
import { 
  createStudent, 
  getStudents, 
  getStudentById, 
  getStudentByQRCode, 
  updateStudent, 
  deleteStudent, 
  regenerateQRCode 
} from './handlers/students';
import { 
  createAttendance, 
  processQRScan, 
  getAttendanceByDate, 
  getAttendanceByStudent, 
  getAttendanceReport, 
  updateAttendance, 
  getDailyAttendanceSummary 
} from './handlers/attendance';
import { 
  sendWhatsAppNotification, 
  processNotificationQueue, 
  getNotificationHistory, 
  retryFailedNotification 
} from './handlers/notifications';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  verifyToken: publicProcedure
    .input(z.string())
    .query(({ input }) => verifyToken(input)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteUser(input)),

  // Class management routes
  createClass: publicProcedure
    .input(createClassInputSchema)
    .mutation(({ input }) => createClass(input)),

  getClasses: publicProcedure
    .query(() => getClasses()),

  getClassById: publicProcedure
    .input(z.number())
    .query(({ input }) => getClassById(input)),

  updateClass: publicProcedure
    .input(updateClassInputSchema)
    .mutation(({ input }) => updateClass(input)),

  deleteClass: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteClass(input)),

  // Student management routes
  createStudent: publicProcedure
    .input(createStudentInputSchema)
    .mutation(({ input }) => createStudent(input)),

  getStudents: publicProcedure
    .query(() => getStudents()),

  getStudentById: publicProcedure
    .input(z.number())
    .query(({ input }) => getStudentById(input)),

  getStudentByQRCode: publicProcedure
    .input(z.string())
    .query(({ input }) => getStudentByQRCode(input)),

  updateStudent: publicProcedure
    .input(updateStudentInputSchema)
    .mutation(({ input }) => updateStudent(input)),

  deleteStudent: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteStudent(input)),

  regenerateQRCode: publicProcedure
    .input(z.number())
    .mutation(({ input }) => regenerateQRCode(input)),

  // Attendance routes
  createAttendance: publicProcedure
    .input(createAttendanceInputSchema)
    .mutation(({ input }) => createAttendance(input)),

  processQRScan: publicProcedure
    .input(qrScanInputSchema)
    .mutation(({ input }) => processQRScan(input)),

  getAttendanceByDate: publicProcedure
    .input(z.coerce.date())
    .query(({ input }) => getAttendanceByDate(input)),

  getAttendanceByStudent: publicProcedure
    .input(z.object({
      studentId: z.number(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional()
    }))
    .query(({ input }) => getAttendanceByStudent(input.studentId, input.startDate, input.endDate)),

  getAttendanceReport: publicProcedure
    .input(attendanceReportFilterSchema)
    .query(({ input }) => getAttendanceReport(input)),

  updateAttendance: publicProcedure
    .input(updateAttendanceInputSchema)
    .mutation(({ input }) => updateAttendance(input)),

  getDailyAttendanceSummary: publicProcedure
    .input(z.coerce.date())
    .query(({ input }) => getDailyAttendanceSummary(input)),

  // Notification routes
  sendWhatsAppNotification: publicProcedure
    .input(z.object({
      studentId: z.number(),
      message: z.string()
    }))
    .mutation(({ input }) => sendWhatsAppNotification(input.studentId, input.message)),

  processNotificationQueue: publicProcedure
    .mutation(() => processNotificationQueue()),

  getNotificationHistory: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getNotificationHistory(input)),

  retryFailedNotification: publicProcedure
    .input(z.number())
    .mutation(({ input }) => retryFailedNotification(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Student Attendance System TRPC server listening at port: ${port}`);
}

start();
