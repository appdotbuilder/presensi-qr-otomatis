
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, studentsTable, notificationsTable } from '../db/schema';
import { 
  sendWhatsAppNotification, 
  processNotificationQueue, 
  getNotificationHistory, 
  retryFailedNotification 
} from '../handlers/notifications';
import { eq } from 'drizzle-orm';

describe('notifications handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data helper
  const createTestData = async () => {
    // Create teacher user
    const teachers = await db.insert(usersTable)
      .values({
        username: 'teacher1',
        password: 'password123',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create class
    const classes = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        teacher_id: teachers[0].id
      })
      .returning()
      .execute();

    // Create student
    const students = await db.insert(studentsTable)
      .values({
        student_number: 'STU001',
        full_name: 'Test Student',
        class_id: classes[0].id,
        parent_whatsapp: '+1234567890',
        qr_code: 'QR001',
        user_id: null
      })
      .returning()
      .execute();

    return { teacher: teachers[0], class: classes[0], student: students[0] };
  };

  describe('sendWhatsAppNotification', () => {
    it('should create notification for valid student', async () => {
      const { student } = await createTestData();

      const result = await sendWhatsAppNotification(student.id, 'Test message');

      expect(result.student_id).toEqual(student.id);
      expect(result.message).toEqual('Test message');
      expect(result.whatsapp_number).toEqual('+1234567890');
      expect(result.status).toEqual('pending');
      expect(result.sent_at).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save notification to database', async () => {
      const { student } = await createTestData();

      const result = await sendWhatsAppNotification(student.id, 'Test message');

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, result.id))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toEqual('Test message');
      expect(notifications[0].whatsapp_number).toEqual('+1234567890');
      expect(notifications[0].status).toEqual('pending');
    });

    it('should throw error for non-existent student', async () => {
      await expect(sendWhatsAppNotification(999, 'Test message'))
        .rejects.toThrow(/Student with ID 999 not found/);
    });
  });

  describe('processNotificationQueue', () => {
    it('should process pending notifications', async () => {
      const { student } = await createTestData();

      // Create pending notifications
      await db.insert(notificationsTable)
        .values([
          {
            student_id: student.id,
            message: 'Message 1',
            whatsapp_number: '+1234567890',
            status: 'pending'
          },
          {
            student_id: student.id,
            message: 'Message 2',
            whatsapp_number: '+1234567890',
            status: 'pending'
          }
        ])
        .execute();

      const result = await processNotificationQueue();

      expect(result.processed).toEqual(2);

      // Check notifications are marked as sent
      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.status, 'sent'))
        .execute();

      expect(notifications).toHaveLength(2);
      notifications.forEach(notification => {
        expect(notification.sent_at).toBeInstanceOf(Date);
      });
    });

    it('should not process already sent notifications', async () => {
      const { student } = await createTestData();

      // Create already sent notification
      await db.insert(notificationsTable)
        .values({
          student_id: student.id,
          message: 'Already sent',
          whatsapp_number: '+1234567890',
          status: 'sent',
          sent_at: new Date()
        })
        .execute();

      const result = await processNotificationQueue();

      expect(result.processed).toEqual(0);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return all notifications when no filter', async () => {
      const { student } = await createTestData();

      // Create notifications
      await db.insert(notificationsTable)
        .values([
          {
            student_id: student.id,
            message: 'Message 1',
            whatsapp_number: '+1234567890',
            status: 'sent'
          },
          {
            student_id: student.id,
            message: 'Message 2',
            whatsapp_number: '+1234567890',
            status: 'pending'
          }
        ])
        .execute();

      const result = await getNotificationHistory();

      expect(result).toHaveLength(2);
      expect(result.some(n => n.message === 'Message 1')).toBe(true);
      expect(result.some(n => n.message === 'Message 2')).toBe(true);
    });

    it('should filter notifications by student_id', async () => {
      const { student } = await createTestData();

      // Create another student
      const otherStudents = await db.insert(studentsTable)
        .values({
          student_number: 'STU002',
          full_name: 'Other Student',
          class_id: student.class_id,
          parent_whatsapp: '+9876543210',
          qr_code: 'QR002',
          user_id: null
        })
        .returning()
        .execute();

      // Create notifications for both students
      await db.insert(notificationsTable)
        .values([
          {
            student_id: student.id,
            message: 'Message for student 1',
            whatsapp_number: '+1234567890',
            status: 'sent'
          },
          {
            student_id: otherStudents[0].id,
            message: 'Message for student 2',
            whatsapp_number: '+9876543210',
            status: 'sent'
          }
        ])
        .execute();

      const result = await getNotificationHistory(student.id);

      expect(result).toHaveLength(1);
      expect(result[0].message).toEqual('Message for student 1');
      expect(result[0].student_id).toEqual(student.id);
    });
  });

  describe('retryFailedNotification', () => {
    it('should retry failed notification successfully', async () => {
      const { student } = await createTestData();

      // Create failed notification
      const failedNotifications = await db.insert(notificationsTable)
        .values({
          student_id: student.id,
          message: 'Failed message',
          whatsapp_number: '+1234567890',
          status: 'failed'
        })
        .returning()
        .execute();

      const result = await retryFailedNotification(failedNotifications[0].id);

      expect(result.status).toEqual('sent');
      expect(result.sent_at).toBeInstanceOf(Date);
      expect(result.message).toEqual('Failed message');
    });

    it('should throw error for non-existent failed notification', async () => {
      await createTestData(); // Ensure tables exist

      await expect(retryFailedNotification(999))
        .rejects.toThrow(/Failed notification with ID 999 not found/);
    });

    it('should throw error when trying to retry non-failed notification', async () => {
      const { student } = await createTestData();

      // Create sent notification
      const sentNotifications = await db.insert(notificationsTable)
        .values({
          student_id: student.id,
          message: 'Sent message',
          whatsapp_number: '+1234567890',
          status: 'sent',
          sent_at: new Date()
        })
        .returning()
        .execute();

      await expect(retryFailedNotification(sentNotifications[0].id))
        .rejects.toThrow(/Failed notification with ID .* not found/);
    });
  });
});
