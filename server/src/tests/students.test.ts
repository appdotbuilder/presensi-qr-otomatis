
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, classesTable, usersTable } from '../db/schema';
import { type CreateStudentInput, type UpdateStudentInput } from '../schema';
import { 
  createStudent, 
  getStudents, 
  getStudentById, 
  getStudentByQRCode, 
  updateStudent, 
  deleteStudent, 
  regenerateQRCode 
} from '../handlers/students';
import { eq } from 'drizzle-orm';

describe('Student Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test class
  const createTestClass = async () => {
    const result = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        teacher_id: null
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'student'
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('createStudent', () => {
    it('should create a student successfully', async () => {
      const testClass = await createTestClass();
      
      const input: CreateStudentInput = {
        student_number: 'STU001',
        full_name: 'John Doe',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      };

      const result = await createStudent(input);

      expect(result.student_number).toEqual('STU001');
      expect(result.full_name).toEqual('John Doe');
      expect(result.class_id).toEqual(testClass.id);
      expect(result.parent_whatsapp).toEqual('+1234567890');
      expect(result.user_id).toBeNull();
      expect(result.qr_code).toMatch(/^QR-[a-f0-9-]{36}$/);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a student with user_id', async () => {
      const testClass = await createTestClass();
      const testUser = await createTestUser();
      
      const input: CreateStudentInput = {
        student_number: 'STU002',
        full_name: 'Jane Smith',
        class_id: testClass.id,
        parent_whatsapp: '+0987654321',
        user_id: testUser.id
      };

      const result = await createStudent(input);

      expect(result.user_id).toEqual(testUser.id);
      expect(result.full_name).toEqual('Jane Smith');
    });

    it('should save student to database', async () => {
      const testClass = await createTestClass();
      
      const input: CreateStudentInput = {
        student_number: 'STU003',
        full_name: 'Bob Wilson',
        class_id: testClass.id,
        parent_whatsapp: '+1122334455',
        user_id: null
      };

      const result = await createStudent(input);

      const students = await db.select()
        .from(studentsTable)
        .where(eq(studentsTable.id, result.id))
        .execute();

      expect(students).toHaveLength(1);
      expect(students[0].student_number).toEqual('STU003');
      expect(students[0].full_name).toEqual('Bob Wilson');
    });

    it('should throw error for non-existent class', async () => {
      const input: CreateStudentInput = {
        student_number: 'STU004',
        full_name: 'Invalid Student',
        class_id: 999,
        parent_whatsapp: '+1234567890',
        user_id: null
      };

      expect(createStudent(input)).rejects.toThrow(/class with id 999 does not exist/i);
    });

    it('should throw error for non-existent user', async () => {
      const testClass = await createTestClass();
      
      const input: CreateStudentInput = {
        student_number: 'STU005',
        full_name: 'Invalid User Student',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: 999
      };

      expect(createStudent(input)).rejects.toThrow(/user with id 999 does not exist/i);
    });
  });

  describe('getStudents', () => {
    it('should return empty array when no students exist', async () => {
      const result = await getStudents();
      expect(result).toEqual([]);
    });

    it('should return all students', async () => {
      const testClass = await createTestClass();
      
      await createStudent({
        student_number: 'STU001',
        full_name: 'Student One',
        class_id: testClass.id,
        parent_whatsapp: '+1111111111',
        user_id: null
      });

      await createStudent({
        student_number: 'STU002',
        full_name: 'Student Two',
        class_id: testClass.id,
        parent_whatsapp: '+2222222222',
        user_id: null
      });

      const result = await getStudents();
      expect(result).toHaveLength(2);
      expect(result[0].full_name).toEqual('Student One');
      expect(result[1].full_name).toEqual('Student Two');
    });
  });

  describe('getStudentById', () => {
    it('should return null for non-existent student', async () => {
      const result = await getStudentById(999);
      expect(result).toBeNull();
    });

    it('should return student by id', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Test Student',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const result = await getStudentById(student.id);
      expect(result).not.toBeNull();
      expect(result?.full_name).toEqual('Test Student');
      expect(result?.student_number).toEqual('STU001');
    });
  });

  describe('getStudentByQRCode', () => {
    it('should return null for non-existent QR code', async () => {
      const result = await getStudentByQRCode('invalid-qr-code');
      expect(result).toBeNull();
    });

    it('should return student by QR code', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'QR Test Student',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const result = await getStudentByQRCode(student.qr_code);
      expect(result).not.toBeNull();
      expect(result?.full_name).toEqual('QR Test Student');
      expect(result?.id).toEqual(student.id);
    });
  });

  describe('updateStudent', () => {
    it('should update student fields', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Original Name',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const input: UpdateStudentInput = {
        id: student.id,
        full_name: 'Updated Name',
        parent_whatsapp: '+0987654321'
      };

      const result = await updateStudent(input);

      expect(result.full_name).toEqual('Updated Name');
      expect(result.parent_whatsapp).toEqual('+0987654321');
      expect(result.student_number).toEqual('STU001'); // Should remain unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(student.updated_at.getTime());
    });

    it('should update student with new class', async () => {
      const testClass1 = await createTestClass();
      const testClass2 = await db.insert(classesTable)
        .values({
          name: 'Second Class',
          teacher_id: null
        })
        .returning()
        .execute();

      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Test Student',
        class_id: testClass1.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const input: UpdateStudentInput = {
        id: student.id,
        class_id: testClass2[0].id
      };

      const result = await updateStudent(input);
      expect(result.class_id).toEqual(testClass2[0].id);
    });

    it('should throw error for non-existent student', async () => {
      const input: UpdateStudentInput = {
        id: 999,
        full_name: 'Updated Name'
      };

      expect(updateStudent(input)).rejects.toThrow(/student with id 999 does not exist/i);
    });

    it('should throw error for non-existent class', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Test Student',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const input: UpdateStudentInput = {
        id: student.id,
        class_id: 999
      };

      expect(updateStudent(input)).rejects.toThrow(/class with id 999 does not exist/i);
    });

    it('should throw error for non-existent user', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Test Student',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const input: UpdateStudentInput = {
        id: student.id,
        user_id: 999
      };

      expect(updateStudent(input)).rejects.toThrow(/user with id 999 does not exist/i);
    });
  });

  describe('deleteStudent', () => {
    it('should delete student successfully', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'Delete Test',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const result = await deleteStudent(student.id);
      expect(result.success).toBe(true);

      // Verify student is deleted
      const deletedStudent = await getStudentById(student.id);
      expect(deletedStudent).toBeNull();
    });

    it('should throw error for non-existent student', async () => {
      expect(deleteStudent(999)).rejects.toThrow(/student with id 999 does not exist/i);
    });
  });

  describe('regenerateQRCode', () => {
    it('should generate new QR code', async () => {
      const testClass = await createTestClass();
      
      const student = await createStudent({
        student_number: 'STU001',
        full_name: 'QR Regen Test',
        class_id: testClass.id,
        parent_whatsapp: '+1234567890',
        user_id: null
      });

      const originalQRCode = student.qr_code;
      const result = await regenerateQRCode(student.id);

      expect(result.qr_code).toMatch(/^QR-[a-f0-9-]{36}$/);
      expect(result.qr_code).not.toEqual(originalQRCode);

      // Verify student has new QR code in database
      const updatedStudent = await getStudentById(student.id);
      expect(updatedStudent?.qr_code).toEqual(result.qr_code);
    });

    it('should throw error for non-existent student', async () => {
      expect(regenerateQRCode(999)).rejects.toThrow(/student with id 999 does not exist/i);
    });
  });
});
