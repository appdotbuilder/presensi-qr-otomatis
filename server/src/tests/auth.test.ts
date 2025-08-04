
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login, verifyToken } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  full_name: 'Test User',
  role: 'student'
};

const loginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    beforeEach(async () => {
      // Create test user
      await db.insert(usersTable)
        .values(testUser)
        .execute();
    });

    it('should login with valid credentials', async () => {
      const result = await login(loginInput);

      expect(result.user.username).toEqual('testuser');
      expect(result.user.full_name).toEqual('Test User');
      expect(result.user.role).toEqual('student');
      expect(result.user.password).toEqual(''); // Should not return password
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^token_\d+_\d+$/);
    });

    it('should reject invalid username', async () => {
      const invalidLogin = {
        username: 'nonexistent',
        password: 'password123'
      };

      expect(login(invalidLogin)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      const invalidLogin = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      expect(login(invalidLogin)).rejects.toThrow(/invalid username or password/i);
    });

    it('should create valid token format', async () => {
      const result = await login(loginInput);
      
      expect(result.token).toMatch(/^token_\d+_\d+$/);
      
      // Extract user ID from token
      const parts = result.token.split('_');
      expect(parts).toHaveLength(3);
      expect(parseInt(parts[1])).toEqual(result.user.id);
    });
  });

  describe('verifyToken', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      // Create test user and get valid token
      const insertResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      
      userId = insertResult[0].id;
      const loginResult = await login(loginInput);
      validToken = loginResult.token;
    });

    it('should verify valid token', async () => {
      const user = await verifyToken(validToken);

      expect(user).toBeDefined();
      expect(user!.username).toEqual('testuser');
      expect(user!.full_name).toEqual('Test User');
      expect(user!.role).toEqual('student');
      expect(user!.password).toEqual(''); // Should not return password
      expect(user!.id).toEqual(userId);
      expect(user!.created_at).toBeInstanceOf(Date);
    });

    it('should reject invalid token format', async () => {
      const invalidTokens = [
        'invalid_token',
        'token_abc_123',
        'token_123',
        'token_123_456_789',
        ''
      ];

      for (const token of invalidTokens) {
        const user = await verifyToken(token);
        expect(user).toBeNull();
      }
    });

    it('should reject token with non-existent user ID', async () => {
      const invalidToken = 'token_99999_123456789';
      const user = await verifyToken(invalidToken);
      
      expect(user).toBeNull();
    });

    it('should handle missing token', async () => {
      const user = await verifyToken('');
      expect(user).toBeNull();
    });

    it('should verify user exists in database', async () => {
      const user = await verifyToken(validToken);
      
      // Verify user actually exists in database
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user!.id))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].username).toEqual('testuser');
    });
  });
});
