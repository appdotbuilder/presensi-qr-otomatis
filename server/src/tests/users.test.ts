
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  full_name: 'Test User',
  role: 'student'
};

const testTeacherInput: CreateUserInput = {
  username: 'teacher1',
  password: 'teacherpass',
  full_name: 'Teacher One',
  role: 'teacher'
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const result = await createUser(testUserInput);

      expect(result.username).toEqual('testuser');
      expect(result.full_name).toEqual('Test User');
      expect(result.role).toEqual('student');
      expect(result.password).toEqual(''); // Should not return password
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save user to database with hashed password', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].password).not.toEqual('password123'); // Should be hashed
      expect(users[0].password.length).toBeGreaterThan(0);
      expect(users[0].full_name).toEqual('Test User');
      expect(users[0].role).toEqual('student');
    });

    it('should handle duplicate username error', async () => {
      await createUser(testUserInput);

      await expect(createUser(testUserInput)).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();

      expect(result).toEqual([]);
    });

    it('should return all users without passwords', async () => {
      await createUser(testUserInput);
      await createUser(testTeacherInput);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].password).toEqual('');
      expect(result[1].password).toEqual('');
      expect(result.some(u => u.username === 'testuser')).toBe(true);
      expect(result.some(u => u.username === 'teacher1')).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return null when user does not exist', async () => {
      const result = await getUserById(999);

      expect(result).toBeNull();
    });

    it('should return user without password when user exists', async () => {
      const created = await createUser(testUserInput);

      const result = await getUserById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.password).toEqual('');
      expect(result!.full_name).toEqual('Test User');
      expect(result!.role).toEqual('student');
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const created = await createUser(testUserInput);

      const updateInput: UpdateUserInput = {
        id: created.id,
        username: 'updateduser',
        full_name: 'Updated Name',
        role: 'teacher'
      };

      const result = await updateUser(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.username).toEqual('updateduser');
      expect(result.full_name).toEqual('Updated Name');
      expect(result.role).toEqual('teacher');
      expect(result.password).toEqual('');
      expect(result.updated_at).not.toEqual(created.updated_at);
    });

    it('should update password when provided', async () => {
      const created = await createUser(testUserInput);

      const updateInput: UpdateUserInput = {
        id: created.id,
        password: 'newpassword123'
      };

      await updateUser(updateInput);

      // Verify password was changed in database
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, created.id))
        .execute();

      expect(users[0].password).not.toEqual('password123');
      expect(users[0].password.length).toBeGreaterThan(0);

      // Verify password can be verified
      const isValid = await Bun.password.verify('newpassword123', users[0].password);
      expect(isValid).toBe(true);
    });

    it('should handle non-existent user', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        username: 'nonexistent'
      };

      await expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteUser', () => {
    it('should return false when user does not exist', async () => {
      const result = await deleteUser(999);

      expect(result.success).toBe(false);
    });

    it('should delete user and return true when user exists', async () => {
      const created = await createUser(testUserInput);

      const result = await deleteUser(created.id);

      expect(result.success).toBe(true);

      // Verify user is deleted
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, created.id))
        .execute();

      expect(users).toHaveLength(0);
    });
  });
});
