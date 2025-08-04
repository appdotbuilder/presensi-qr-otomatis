
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // In a real implementation, you would hash the input password and compare
    // For now, we'll do a direct comparison (NOT recommended for production)
    if (user.password !== input.password) {
      throw new Error('Invalid username or password');
    }

    // Generate a simple token (in production, use proper JWT with secret key)
    const token = `token_${user.id}_${Date.now()}`;

    // Return user without password
    const userResponse: User = {
      ...user,
      password: '' // Never return actual password
    };

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Simple token validation (in production, use proper JWT verification)
    if (!token || !token.startsWith('token_')) {
      return null;
    }

    // Extract user ID from token
    const parts = token.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const userId = parseInt(parts[1]);
    if (isNaN(userId)) {
      return null;
    }

    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Return user without password
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
