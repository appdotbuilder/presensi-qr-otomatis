
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classesTable, usersTable } from '../db/schema';
import { type CreateClassInput, type UpdateClassInput } from '../schema';
import { createClass, getClasses, getClassById, updateClass, deleteClass } from '../handlers/classes';
import { eq } from 'drizzle-orm';

// Test inputs
const testTeacher = {
  username: 'teacher1',
  password: 'password123',
  full_name: 'Test Teacher',
  role: 'teacher' as const
};

const testClassInput: CreateClassInput = {
  name: 'Math 101',
  teacher_id: null
};

describe('Classes handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createClass', () => {
    it('should create a class without teacher', async () => {
      const result = await createClass(testClassInput);

      expect(result.name).toEqual('Math 101');
      expect(result.teacher_id).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a class with valid teacher', async () => {
      // Create teacher first
      const teacherResult = await db.insert(usersTable)
        .values(testTeacher)
        .returning()
        .execute();

      const classWithTeacher: CreateClassInput = {
        name: 'Science 101',
        teacher_id: teacherResult[0].id
      };

      const result = await createClass(classWithTeacher);

      expect(result.name).toEqual('Science 101');
      expect(result.teacher_id).toEqual(teacherResult[0].id);
      expect(result.id).toBeDefined();
    });

    it('should reject invalid teacher_id', async () => {
      const invalidInput: CreateClassInput = {
        name: 'Invalid Class',
        teacher_id: 999
      };

      await expect(createClass(invalidInput)).rejects.toThrow(/teacher not found/i);
    });

    it('should reject non-teacher user as teacher', async () => {
      // Create student user
      const studentUser = {
        username: 'student1',
        password: 'password123',
        full_name: 'Test Student',
        role: 'student' as const
      };

      const userResult = await db.insert(usersTable)
        .values(studentUser)
        .returning()
        .execute();

      const invalidInput: CreateClassInput = {
        name: 'Invalid Class',
        teacher_id: userResult[0].id
      };

      await expect(createClass(invalidInput)).rejects.toThrow(/teacher not found/i);
    });

    it('should save class to database', async () => {
      const result = await createClass(testClassInput);

      const classes = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, result.id))
        .execute();

      expect(classes).toHaveLength(1);
      expect(classes[0].name).toEqual('Math 101');
      expect(classes[0].teacher_id).toBeNull();
    });
  });

  describe('getClasses', () => {
    it('should return empty array when no classes exist', async () => {
      const result = await getClasses();
      expect(result).toEqual([]);
    });

    it('should return all classes', async () => {
      // Create multiple classes
      await createClass({ name: 'Math 101', teacher_id: null });
      await createClass({ name: 'Science 101', teacher_id: null });

      const result = await getClasses();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Math 101');
      expect(result[1].name).toEqual('Science 101');
    });
  });

  describe('getClassById', () => {
    it('should return null for non-existent class', async () => {
      const result = await getClassById(999);
      expect(result).toBeNull();
    });

    it('should return class by id', async () => {
      const created = await createClass(testClassInput);
      const result = await getClassById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Math 101');
    });
  });

  describe('updateClass', () => {
    it('should update class name', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        name: 'Advanced Math 101'
      };

      const result = await updateClass(updateInput);

      expect(result.name).toEqual('Advanced Math 101');
      expect(result.teacher_id).toBeNull();
      expect(result.id).toEqual(created.id);
    });

    it('should update teacher assignment', async () => {
      // Create teacher
      const teacherResult = await db.insert(usersTable)
        .values(testTeacher)
        .returning()
        .execute();

      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        teacher_id: teacherResult[0].id
      };

      const result = await updateClass(updateInput);

      expect(result.teacher_id).toEqual(teacherResult[0].id);
      expect(result.name).toEqual('Math 101');
    });

    it('should reject invalid teacher_id in update', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        teacher_id: 999
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/teacher not found/i);
    });

    it('should reject non-existent class', async () => {
      const updateInput: UpdateClassInput = {
        id: 999,
        name: 'Non-existent Class'
      };

      await expect(updateClass(updateInput)).rejects.toThrow(/class not found/i);
    });

    it('should update database record', async () => {
      const created = await createClass(testClassInput);

      const updateInput: UpdateClassInput = {
        id: created.id,
        name: 'Updated Math 101'
      };

      await updateClass(updateInput);

      const dbClass = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, created.id))
        .execute();

      expect(dbClass[0].name).toEqual('Updated Math 101');
    });
  });

  describe('deleteClass', () => {
    it('should delete existing class', async () => {
      const created = await createClass(testClassInput);

      const result = await deleteClass(created.id);

      expect(result.success).toBe(true);

      // Verify deletion
      const dbClass = await db.select()
        .from(classesTable)
        .where(eq(classesTable.id, created.id))
        .execute();

      expect(dbClass).toHaveLength(0);
    });

    it('should return false for non-existent class', async () => {
      const result = await deleteClass(999);
      expect(result.success).toBe(false);
    });
  });
});
