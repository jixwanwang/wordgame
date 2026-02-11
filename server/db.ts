/**
 * Database interface for the word game backend
 */

export interface PuzzleResult {
  username: string;
  date: string;
  guesses: string[];
  numGuesses: number;
  won: boolean;
  submittedAt: Date;
}

export interface UserStats {
  username: string;
  currentStreak: number;
  lastCompletedDate: string | null;
  updatedAt: Date;
}

export interface GroupInfo {
  id: number;
  name: string;
  creatorUsername: string;
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
   * Get all puzzle results for a specific user
   * @returns Array of PuzzleResult for the user
   */
  getAllPuzzleResults(username: string): Promise<PuzzleResult[]>;

  /**
   * Insert or update puzzle result for a user and date
   * @throws Error if validation fails
   */
  insertPuzzleResult(
    username: string,
    date: string,
    guesses: string[],
    won: boolean,
  ): Promise<void>;

  /**
   * Get user stats (streak, last completed date)
   * @returns UserStats if found, null otherwise
   */
  getUserStats(username: string): Promise<UserStats | null>;

  /**
   * Update user stats (streak, last completed date)
   * Creates the record if it doesn't exist
   */
  updateUserStats(
    username: string,
    currentStreak: number,
    lastCompletedDate: string,
  ): Promise<void>;

  // Groups
  createGroup(name: string, creatorUsername: string): Promise<GroupInfo>;
  getGroup(groupId: number): Promise<GroupInfo | null>;
  getGroupsForUser(username: string): Promise<GroupInfo[]>;
  deleteGroup(groupId: number): Promise<void>;

  // Group membership
  addUserToGroup(groupId: number, username: string): Promise<void>;
  removeUserFromGroup(groupId: number, username: string): Promise<void>;
  getGroupMembers(groupId: number): Promise<string[]>;
  isUserInGroup(groupId: number, username: string): Promise<boolean>;
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
  private userStats: Map<string, UserStats> = new Map(); // lowercase username -> UserStats
  private groups: Map<number, GroupInfo> = new Map();
  private groupMembers: Map<number, Set<string>> = new Map();
  private nextGroupId = 1;

  async userExists(username: string): Promise<boolean> {
    return this.users.has(username.toLowerCase());
  }

  async createUser(username: string, password: string): Promise<void> {
    const lowerUsername = username.toLowerCase();
    if (this.users.has(lowerUsername)) {
      throw new Error("Username already exists");
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

  async getAllPuzzleResults(username: string): Promise<PuzzleResult[]> {
    const lowerUsername = username.toLowerCase();
    const results: PuzzleResult[] = [];
    for (const [, result] of this.results.entries()) {
      if (result.username.toLowerCase() === lowerUsername) {
        results.push(result);
      }
    }
    return results;
  }

  async insertPuzzleResult(
    username: string,
    date: string,
    guesses: string[],
    won: boolean,
  ): Promise<void> {
    const key = `${username}_${date}`;
    const result: PuzzleResult = {
      username,
      date,
      guesses,
      numGuesses: guesses.length,
      won,
      submittedAt: new Date(),
    };
    this.results.set(key, result);
  }

  async getUserStats(username: string): Promise<UserStats | null> {
    const lowerUsername = username.toLowerCase();
    return this.userStats.get(lowerUsername) || null;
  }

  async updateUserStats(
    username: string,
    currentStreak: number,
    lastCompletedDate: string,
  ): Promise<void> {
    const lowerUsername = username.toLowerCase();
    this.userStats.set(lowerUsername, {
      username: lowerUsername,
      currentStreak,
      lastCompletedDate,
      updatedAt: new Date(),
    });
  }

  async createGroup(name: string, creatorUsername: string): Promise<GroupInfo> {
    const id = this.nextGroupId++;
    const group: GroupInfo = { id, name, creatorUsername };
    this.groups.set(id, group);
    this.groupMembers.set(id, new Set());
    return group;
  }

  async getGroup(groupId: number): Promise<GroupInfo | null> {
    return this.groups.get(groupId) ?? null;
  }

  async getGroupsForUser(username: string): Promise<GroupInfo[]> {
    const result: GroupInfo[] = [];
    for (const [groupId, members] of this.groupMembers.entries()) {
      if (members.has(username)) {
        const group = this.groups.get(groupId);
        if (group !== undefined) {
          result.push(group);
        }
      }
    }
    return result;
  }

  async deleteGroup(groupId: number): Promise<void> {
    this.groups.delete(groupId);
    this.groupMembers.delete(groupId);
  }

  async addUserToGroup(groupId: number, username: string): Promise<void> {
    const members = this.groupMembers.get(groupId);
    if (members !== undefined) {
      members.add(username);
    }
  }

  async removeUserFromGroup(groupId: number, username: string): Promise<void> {
    const members = this.groupMembers.get(groupId);
    if (members !== undefined) {
      members.delete(username);
    }
  }

  async getGroupMembers(groupId: number): Promise<string[]> {
    const members = this.groupMembers.get(groupId);
    return members !== undefined ? Array.from(members) : [];
  }

  async isUserInGroup(groupId: number, username: string): Promise<boolean> {
    const members = this.groupMembers.get(groupId);
    return members !== undefined ? members.has(username) : false;
  }
}
