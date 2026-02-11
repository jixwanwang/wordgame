/**
 * PostgreSQL implementation of the Database interface using Drizzle ORM
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { users, results, userStats, groups, userGroups } from "./schema.js";
import type { Database, PuzzleResult, UserStats, GroupInfo } from "./db.js";

const SALT_ROUNDS = 10;

export class PostgresDatabase implements Database {
  private db;
  private pool: typeof Pool.prototype;

  constructor(connectionString: string) {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    // Create pool and drizzle instance using standard node-postgres
    this.pool = new Pool({ connectionString });
    this.pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });

    this.db = drizzle(this.pool);
  }

  async userExists(username: string): Promise<boolean> {
    const lowerUsername = username.toLowerCase();
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, lowerUsername))
      .limit(1);

    return result.length > 0;
  }

  async createUser(username: string, password: string): Promise<void> {
    const lowerUsername = username.toLowerCase();

    // Check if user already exists
    const exists = await this.userExists(username);
    if (exists) {
      throw new Error("Username already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    await this.db.insert(users).values({
      username: lowerUsername,
      originalUsername: username,
      passwordHash,
    });
  }

  async validateUser(username: string, password: string): Promise<boolean> {
    const lowerUsername = username.toLowerCase();

    // Get user
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, lowerUsername))
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const user = result[0];

    // Verify password
    return await bcrypt.compare(password, user.passwordHash);
  }

  async getOriginalUsername(username: string): Promise<string | null> {
    const lowerUsername = username.toLowerCase();

    const result = await this.db
      .select({ originalUsername: users.originalUsername })
      .from(users)
      .where(eq(users.username, lowerUsername))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0].originalUsername;
  }

  async getPuzzleResult(username: string, date: string): Promise<PuzzleResult | null> {
    try {
      const lowerUsername = username.toLowerCase();

      const result = await this.db
        .select()
        .from(results)
        .where(and(eq(results.username, lowerUsername), eq(results.date, date)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];

      // Parse guesses from JSON string
      const guesses = JSON.parse(row.guesses);

      return {
        username: row.username,
        date: row.date,
        guesses,
        numGuesses: row.numGuesses,
        won: row.won,
        submittedAt: row.submittedAt,
      };
    } catch (error) {
      console.error(`Error in getPuzzleResult for user ${username}, date ${date}:`, error);
      throw error;
    }
  }

  async getAllPuzzleResults(username: string): Promise<PuzzleResult[]> {
    const lowerUsername = username.toLowerCase();

    const rows = await this.db
      .select()
      .from(results)
      .where(eq(results.username, lowerUsername));

    return rows.map(row => ({
      username: row.username,
      date: row.date,
      guesses: JSON.parse(row.guesses),
      numGuesses: row.numGuesses,
      won: row.won,
      submittedAt: row.submittedAt,
    }));
  }

  async insertPuzzleResult(
    username: string,
    date: string,
    guesses: string[],
    won: boolean,
  ): Promise<void> {
    const lowerUsername = username.toLowerCase();

    // Serialize guesses to JSON
    const guessesJson = JSON.stringify(guesses);
    const numGuesses = guesses.length;

    // Insert only if not exists (do not overwrite existing records)
    await this.db
      .insert(results)
      .values({
        username: lowerUsername,
        date,
        guesses: guessesJson,
        numGuesses,
        won,
      })
      .onConflictDoNothing({
        target: [results.username, results.date],
      });
  }

  async getUserStats(username: string): Promise<UserStats | null> {
    const lowerUsername = username.toLowerCase();

    const result = await this.db
      .select()
      .from(userStats)
      .where(eq(userStats.username, lowerUsername))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    return {
      username: row.username,
      currentStreak: row.currentStreak,
      lastCompletedDate: row.lastCompletedDate,
      updatedAt: row.updatedAt,
    };
  }

  async updateUserStats(
    username: string,
    currentStreak: number,
    lastCompletedDate: string,
  ): Promise<void> {
    const lowerUsername = username.toLowerCase();

    await this.db
      .insert(userStats)
      .values({
        username: lowerUsername,
        currentStreak,
        lastCompletedDate,
      })
      .onConflictDoUpdate({
        target: [userStats.username],
        set: {
          currentStreak,
          lastCompletedDate,
          updatedAt: new Date(),
        },
      });
  }

  async createGroup(name: string, creatorUsername: string): Promise<GroupInfo> {
    const result = await this.db
      .insert(groups)
      .values({ name, creatorUsername })
      .returning();

    const row = result[0];
    return { id: row.id, name: row.name, creatorUsername: row.creatorUsername };
  }

  async getGroup(groupId: number): Promise<GroupInfo | null> {
    const result = await this.db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return { id: row.id, name: row.name, creatorUsername: row.creatorUsername };
  }

  async getGroupsForUser(username: string): Promise<GroupInfo[]> {
    const rows = await this.db
      .select({
        id: groups.id,
        name: groups.name,
        creatorUsername: groups.creatorUsername,
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.username, username));

    return rows;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.db.delete(groups).where(eq(groups.id, groupId));
  }

  async addUserToGroup(groupId: number, username: string): Promise<void> {
    await this.db.insert(userGroups).values({ groupId, username });
  }

  async removeUserFromGroup(groupId: number, username: string): Promise<void> {
    await this.db
      .delete(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.username, username)));
  }

  async getGroupMembers(groupId: number): Promise<string[]> {
    const rows = await this.db
      .select({ username: userGroups.username })
      .from(userGroups)
      .where(eq(userGroups.groupId, groupId));

    return rows.map((row) => row.username);
  }

  async isUserInGroup(groupId: number, username: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.username, username)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
