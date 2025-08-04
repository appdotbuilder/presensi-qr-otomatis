
import { db } from '../db';
import { studentsTable, classesTable, usersTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput, type Student } from '../schema';
import { eq, and } from 'drizzle-orm';

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  try {
    // Verify class exists
    const existingClass = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.class_id))
      .execute();

    if (existingClass.length === 0) {
      throw new Error(`Class with id ${input.class_id} does not exist`);
    }

    // Verify user exists if user_id is provided
    if (input.user_id !== null) {
      const existingUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (existingUser.length === 0) {
        throw new Error(`User with id ${input.user_id} does not exist`);
      }
    }

    // Generate unique QR code
    const qrCode = `QR-${generateUUID()}`;

    // Insert student record
    const result = await db.insert(studentsTable)
      .values({
        student_number: input.student_number,
        full_name: input.full_name,
        class_id: input.class_id,
        parent_whatsapp: input.parent_whatsapp,
        qr_code: qrCode,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
}

export async function getStudents(): Promise<Student[]> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by id:', error);
    throw error;
  }
}

export async function getStudentByQRCode(qrCode: string): Promise<Student | null> {
  try {
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.qr_code, qrCode))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch student by QR code:', error);
    throw error;
  }
}

export async function updateStudent(input: UpdateStudentInput): Promise<Student> {
  try {
    // Verify student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error(`Student with id ${input.id} does not exist`);
    }

    // Verify class exists if class_id is being updated
    if (input.class_id !== undefined) {
      const existingClass = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, input.class_id))
        .execute();

      if (existingClass.length === 0) {
        throw new Error(`Class with id ${input.class_id} does not exist`);
      }
    }

    // Verify user exists if user_id is being updated
    if (input.user_id !== undefined && input.user_id !== null) {
      const existingUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (existingUser.length === 0) {
        throw new Error(`User with id ${input.user_id} does not exist`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.student_number !== undefined) updateData.student_number = input.student_number;
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.class_id !== undefined) updateData.class_id = input.class_id;
    if (input.parent_whatsapp !== undefined) updateData.parent_whatsapp = input.parent_whatsapp;
    if (input.user_id !== undefined) updateData.user_id = input.user_id;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student update failed:', error);
    throw error;
  }
}

export async function deleteStudent(id: number): Promise<{ success: boolean }> {
  try {
    // Verify student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error(`Student with id ${id} does not exist`);
    }

    await db.delete(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Student deletion failed:', error);
    throw error;
  }
}

export async function regenerateQRCode(id: number): Promise<{ qr_code: string }> {
  try {
    // Verify student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error(`Student with id ${id} does not exist`);
    }

    // Generate new unique QR code
    const newQrCode = `QR-${generateUUID()}`;

    await db.update(studentsTable)
      .set({ 
        qr_code: newQrCode,
        updated_at: new Date()
      })
      .where(eq(studentsTable.id, id))
      .execute();

    return { qr_code: newQrCode };
  } catch (error) {
    console.error('QR code regeneration failed:', error);
    throw error;
  }
}
