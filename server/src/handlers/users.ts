
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash password before storing (simple hash for demonstration)
    const hashedPassword = await Bun.password.hash(input.password);

    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: hashedPassword,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results.map(user => ({
      ...user,
      password: '' // Never return actual password
    }));
  } catch (error) {
    console.error('Users fetch failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User fetch failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};

    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.password !== undefined) {
      updateData.password = await Bun.password.hash(input.password);
    }
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id })
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}
