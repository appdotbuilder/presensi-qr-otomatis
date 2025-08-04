
import { db } from '../db';
import { notificationsTable, studentsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function sendWhatsAppNotification(studentId: number, message: string): Promise<Notification> {
  try {
    // Get student's parent WhatsApp number
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    if (students.length === 0) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    const student = students[0];

    // Create notification record
    const result = await db.insert(notificationsTable)
      .values({
        student_id: studentId,
        message: message,
        whatsapp_number: student.parent_whatsapp,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    throw error;
  }
}

export async function processNotificationQueue(): Promise<{ processed: number }> {
  try {
    // Get pending notifications
    const pendingNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.status, 'pending'))
      .execute();

    let processed = 0;

    for (const notification of pendingNotifications) {
      try {
        // Simulate WhatsApp API call with shorter delay for tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update notification status to sent
        await db.update(notificationsTable)
          .set({
            status: 'sent',
            sent_at: new Date()
          })
          .where(eq(notificationsTable.id, notification.id))
          .execute();

        processed++;
      } catch (error) {
        // Mark as failed if sending fails
        await db.update(notificationsTable)
          .set({
            status: 'failed'
          })
          .where(eq(notificationsTable.id, notification.id))
          .execute();
        
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }

    return { processed };
  } catch (error) {
    console.error('Failed to process notification queue:', error);
    throw error;
  }
}

export async function getNotificationHistory(studentId?: number): Promise<Notification[]> {
  try {
    // Build query with proper conditional filtering
    const baseQuery = db.select().from(notificationsTable);
    
    const results = studentId !== undefined
      ? await baseQuery.where(eq(notificationsTable.student_id, studentId)).execute()
      : await baseQuery.execute();

    return results;
  } catch (error) {
    console.error('Failed to get notification history:', error);
    throw error;
  }
}

export async function retryFailedNotification(notificationId: number): Promise<Notification> {
  try {
    // Get the failed notification
    const notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.status, 'failed')
        )
      )
      .execute();

    if (notifications.length === 0) {
      throw new Error(`Failed notification with ID ${notificationId} not found`);
    }

    // Update status to retrying
    const result = await db.update(notificationsTable)
      .set({
        status: 'retrying'
      })
      .where(eq(notificationsTable.id, notificationId))
      .returning()
      .execute();

    try {
      // Simulate WhatsApp API retry with shorter delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update to sent on success
      await db.update(notificationsTable)
        .set({
          status: 'sent',
          sent_at: new Date()
        })
        .where(eq(notificationsTable.id, notificationId))
        .execute();

      // Return updated notification
      const updatedNotifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, notificationId))
        .execute();

      return updatedNotifications[0];
    } catch (retryError) {
      // Mark as failed again if retry fails
      await db.update(notificationsTable)
        .set({
          status: 'failed'
        })
        .where(eq(notificationsTable.id, notificationId))
        .execute();
      
      throw retryError;
    }
  } catch (error) {
    console.error('Failed to retry notification:', error);
    throw error;
  }
}
