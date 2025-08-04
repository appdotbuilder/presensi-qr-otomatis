
import { db } from '../db';
import { classesTable, usersTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput, type Class } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createClass(input: CreateClassInput): Promise<Class> {
  try {
    // Validate teacher exists and has teacher role if teacher_id is provided
    if (input.teacher_id) {
      const teacher = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.id, input.teacher_id),
          eq(usersTable.role, 'teacher')
        ))
        .execute();

      if (teacher.length === 0) {
        throw new Error('Teacher not found or user is not a teacher');
      }
    }

    const result = await db.insert(classesTable)
      .values({
        name: input.name,
        teacher_id: input.teacher_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Class creation failed:', error);
    throw error;
  }
}

export async function getClasses(): Promise<Class[]> {
  try {
    const result = await db.select()
      .from(classesTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    throw error;
  }
}

export async function getClassById(id: number): Promise<Class | null> {
  try {
    const result = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch class by ID:', error);
    throw error;
  }
}

export async function updateClass(input: UpdateClassInput): Promise<Class> {
  try {
    // Validate teacher exists and has teacher role if teacher_id is provided
    if (input.teacher_id) {
      const teacher = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.id, input.teacher_id),
          eq(usersTable.role, 'teacher')
        ))
        .execute();

      if (teacher.length === 0) {
        throw new Error('Teacher not found or user is not a teacher');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.teacher_id !== undefined) {
      updateData.teacher_id = input.teacher_id;
    }

    const result = await db.update(classesTable)
      .set(updateData)
      .where(eq(classesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Class not found');
    }

    return result[0];
  } catch (error) {
    console.error('Class update failed:', error);
    throw error;
  }
}

export async function deleteClass(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(classesTable)
      .where(eq(classesTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Class deletion failed:', error);
    throw error;
  }
}
