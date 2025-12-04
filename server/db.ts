/**
 * Database interface for the word game backend
 */

export interface PuzzleResult {
  username: string;
  date: string;
  score: number;
  words: string[];
  submittedAt: Date;
}

export interface Database {
  /**
   * Check if a user exists
   * @returns true if user exists, false otherwise
   */
  userExists(username: string): Promise<boolean>;

  /**
   * Create a new user with username and plaintext password
   * The password will be hashed before storage
   * @throws Error if username already exists
   */
  createUser(username: string, password: string): Promise<void>;

  /**
   * Validate user credentials with plaintext password
   * @returns true if username exists and password is correct, false otherwise
   */
  validateUser(username: string, password: string): Promise<boolean>;

  /**
   * Get the original username (with preserved casing) for a user
   * @returns Original username if user exists, null otherwise
   */
  getOriginalUsername(username: string): Promise<string | null>;

  /**
   * Get puzzle result for a specific user and date
   * @returns PuzzleResult if found, null otherwise
   */
  getPuzzleResult(username: string, date: string): Promise<PuzzleResult | null>;

  /**
   * Insert or update puzzle result for a user and date
   * @throws Error if validation fails
   */
  insertPuzzleResult(
    username: string,
    date: string,
    score: number,
    words: string[]
  ): Promise<void>;
}

/**
 * Stub implementation of the Database interface for development/testing
 * This doesn't persist any data - it's just for testing the API
 */
export class StubDatabase implements Database {
  // Store users by lowercase username for case-insensitive uniqueness
  // but preserve original username for display
  private users: Map<string, { originalUsername: string; password: string }> = new Map();
  private results: Map<string, PuzzleResult> = new Map(); // `${username}_${date}` -> result

  async userExists(username: string): Promise<boolean> {
    return this.users.has(username.toLowerCase());
  }

  async createUser(username: string, password: string): Promise<void> {
    const lowerUsername = username.toLowerCase();
    if (this.users.has(lowerUsername)) {
      throw new Error('Username already exists');
    }
    // For the stub database, we'll store the plaintext password
    // Real database implementations should hash the password
    // Store with lowercase key but preserve original username
    this.users.set(lowerUsername, {
      originalUsername: username,
      password: password,
    });
  }

  async validateUser(username: string, password: string): Promise<boolean> {
    const lowerUsername = username.toLowerCase();
    const userData = this.users.get(lowerUsername);
    if (userData === null || userData === undefined) {
      return false;
    }
    // For the stub database, we do simple string comparison
    // Real database implementations should use bcrypt.compare
    return userData.password === password;
  }

  async getOriginalUsername(username: string): Promise<string | null> {
    const lowerUsername = username.toLowerCase();
    const userData = this.users.get(lowerUsername);
    return userData?.originalUsername ?? null;
  }

  async getPuzzleResult(username: string, date: string): Promise<PuzzleResult | null> {
    const key = `${username}_${date}`;
    return this.results.get(key) || null;
  }

  async insertPuzzleResult(
    username: string,
    date: string,
    score: number,
    words: string[]
  ): Promise<void> {
    const key = `${username}_${date}`;
    const result: PuzzleResult = {
      username,
      date,
      score,
      words,
      submittedAt: new Date(),
    };
    this.results.set(key, result);
  }
}
