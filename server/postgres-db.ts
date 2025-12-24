/**
 * PostgreSQL implementation of the Database interface using Drizzle ORM
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { users, results } from "./schema.js";
import type { Database, PuzzleResult } from "./db.js";

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

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
