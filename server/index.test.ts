import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import type { Database, PuzzleResult, UserStats, GroupInfo } from './db.js';
import { generateAuthToken, verifyAuthToken } from './auth.js';

// Mock database for testing
class MockDatabase implements Database {
  private users = new Map<string, { originalUsername: string; password: string }>();
  private results = new Map<string, PuzzleResult>();
  private statsMap = new Map<string, UserStats>();
  private groups = new Map<number, GroupInfo>();
  private groupMembers = new Map<number, Set<string>>();
  private nextGroupId = 1;

  async userExists(username: string): Promise<boolean> {
    return this.users.has(username.toLowerCase());
  }

  async createUser(username: string, password: string): Promise<void> {
    const lowerUsername = username.toLowerCase();
    if (this.users.has(lowerUsername)) {
      throw new Error('Username already exists');
    }
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
    const allResults: PuzzleResult[] = [];
    for (const [, result] of this.results.entries()) {
      if (result.username.toLowerCase() === lowerUsername) {
        allResults.push(result);
      }
    }
    return allResults;
  }

  async insertPuzzleResult(
    username: string,
    date: string,
    guesses: string[],
    won: boolean,
  ): Promise<void> {
    const key = `${username}_${date}`;
    this.results.set(key, {
      username,
      date,
      guesses,
      numGuesses: guesses.length,
      won,
      submittedAt: new Date(),
    });
  }

  async getUserStats(username: string): Promise<UserStats | null> {
    return this.statsMap.get(username.toLowerCase()) || null;
  }

  async updateUserStats(username: string, currentStreak: number, lastCompletedDate: string): Promise<void> {
    this.statsMap.set(username.toLowerCase(), {
      username: username.toLowerCase(),
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

  // Test helper methods
  reset() {
    this.users.clear();
    this.results.clear();
    this.statsMap.clear();
    this.groups.clear();
    this.groupMembers.clear();
    this.nextGroupId = 1;
  }
}

describe('API Endpoints', () => {
  describe('POST /api/register', () => {
    test('should register a new user with valid credentials', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'newuser123',
          password: 'password123',
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.username, 'newuser123');
      assert.ok(response.body.token);
      assert.strictEqual(response.body.message, 'Registration successful');

      // Verify token is a valid JWT
      const payload = verifyAuthToken(response.body.token);
      assert.ok(payload);
      assert.strictEqual(payload.username, 'newuser123');
    });

    test('should fail when username already exists', async () => {
      const db = new MockDatabase();
      await db.createUser('existinguser', 'password123');
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'existinguser',
          password: 'password123',
        })
        .expect(409)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Username already exists');
    });

    test('should fail when username is too short', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'ab',
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('at least 3 characters'));
    });

    test('should fail when username is too long', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'a'.repeat(17),
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('at most 16 characters'));
    });

    test('should fail when username contains special characters', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'user@name',
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('letters and numbers'));
    });

    test('should fail when username contains spaces', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'user name',
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('letters and numbers'));
    });

    test('should fail when username contains unicode characters', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'user😊name',
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('letters and numbers'));
    });

    test('should fail when password is too short', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'validuser',
          password: '12345',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.password.includes('at least 10 characters'));
    });

    test('should fail when username is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.username.includes('required'));
    });

    test('should fail when password is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'validuser',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.password.includes('required'));
    });
  });

  describe('POST /api/login', () => {
    test('should login an existing user with correct credentials', async () => {
      const db = new MockDatabase();
      await db.createUser('testuser', 'password123');
      const app = createApp(db);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.username, 'testuser');
      assert.ok(response.body.token);
      assert.strictEqual(response.body.message, 'Login successful');

      // Verify token is a valid JWT
      const payload = verifyAuthToken(response.body.token);
      assert.ok(payload);
      assert.strictEqual(payload.username, 'testuser');
    });

    test('should fail with incorrect password', async () => {
      const db = new MockDatabase();
      await db.createUser('testuser', 'correctpassword');
      const app = createApp(db);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Invalid username or password');
    });

    test('should fail with non-existent user', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect(401)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Invalid username or password');
    });

    test('should fail when username format is invalid', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      // Login doesn't validate username format — it just fails auth
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'user@name',
          password: 'password123',
        })
        .expect(401)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Invalid username or password');
    });

    test('should fail when password is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'validuser',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.errors.password.includes('required'));
    });

    test('should login with case-insensitive username but preserve original casing', async () => {
      const db = new MockDatabase();
      // Register with mixed case
      await db.createUser('TestUser123', 'password123');
      const app = createApp(db);

      // Login with different casing
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'testuser123',
          password: 'password123',
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      // Should return original username with preserved casing
      assert.strictEqual(response.body.username, 'TestUser123');
      assert.ok(response.body.token);

      // Verify token contains original username
      const payload = verifyAuthToken(response.body.token);
      assert.ok(payload);
      assert.strictEqual(payload.username, 'TestUser123');
    });

    test('should prevent duplicate registration with different casing', async () => {
      const db = new MockDatabase();
      // Register with one casing
      await db.createUser('TestUser', 'password123');
      const app = createApp(db);

      // Try to register with different casing
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser',
          password: 'password456',
        })
        .expect(409)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Username already exists');
    });
  });

  describe('GET /api/puzzle', () => {
    test('should return puzzle of the day without authentication', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '01-22-2026' })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.ok(response.body.id);
      assert.ok(response.body.date);
      assert.ok(Array.isArray(response.body.words));
      assert.ok(Array.isArray(response.body.grid));
      assert.strictEqual(response.body.grid.length, 8);
      assert.ok(response.body.wordPositions);
      // Should not have auth info when no token provided
      assert.strictEqual(response.body.auth, undefined);
    });

    test('should return puzzle with auth info when valid token provided', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const username = 'testuser';
      const token = generateAuthToken(username);

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '01-22-2026' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/);

      assert.ok(response.body.id);
      assert.ok(response.body.words);
      assert.ok(response.body.grid);
      // Should include auth info with valid token
      assert.ok(response.body.auth);
      assert.strictEqual(response.body.auth.username, username);
      assert.strictEqual(response.body.auth.tokenStatus, 'valid');
    });

    test('should return puzzle with expired status when token is expired', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      // Create an expired token — must use the same secret as auth.ts.
      // Due to ESM hoisting, auth.ts loads before dotenv.config() runs in index.ts,
      // so it uses the fallback secret, not process.env.JWT_SECRET.
      const expiredToken = jwt.sign(
        { username: 'testuser' },
        'dev-secret-key-change-in-production',
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '01-22-2026' })
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      // Should still return puzzle data
      assert.ok(response.body.id);
      assert.ok(response.body.words);
      assert.ok(response.body.grid);
      // Should include auth info indicating token is expired
      assert.ok(response.body.auth);
      assert.strictEqual(response.body.auth.tokenStatus, 'expired');
      assert.strictEqual(response.body.auth.username, undefined);
    });

    test('should return puzzle with invalid status when token is malformed', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '01-22-2026' })
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(200)
        .expect('Content-Type', /json/);

      // Should still return puzzle data
      assert.ok(response.body.id);
      assert.ok(response.body.words);
      assert.ok(response.body.grid);
      // Should include auth info indicating token is invalid
      assert.ok(response.body.auth);
      assert.strictEqual(response.body.auth.tokenStatus, 'invalid');
      assert.strictEqual(response.body.auth.username, undefined);
    });

    test('should accept optional date parameter', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const requestedDate = '01-23-2026';

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: requestedDate })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.date, requestedDate);
      assert.ok(response.body.id);
      assert.ok(Array.isArray(response.body.words));
      assert.ok(response.body.grid);
    });

    test('should return 404 for date with no puzzle', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '01-01-2020' }) // Date with no puzzle
        .expect(404)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('No puzzle available'));
    });

    test('should validate date format', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: 'invalid-date' })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('Invalid date format'));
    });
  });

  describe('POST /api/submit', () => {
    test('should successfully submit result with valid JWT token', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const username = 'user123';
      const token = generateAuthToken(username);

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_2025_01_15',
          guesses: ['A', 'B', 'C'],
          won: true,
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
    });

    test('should fail when JWT token is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/submit')
        .send({
          puzzleId: 'puzzle_2025_01_15',
          guesses: ['A', 'B'],
          won: true,
        })
        .expect(401)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Authentication token required');
    });

    test('should fail when JWT token is invalid', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          puzzleId: 'puzzle_2025_01_15',
          guesses: ['A', 'B'],
          won: true,
        })
        .expect(403)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Invalid or expired token');
    });

    test('should fail when puzzleId is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          guesses: ['A', 'B'],
          won: true,
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });

    test('should fail when guesses is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_2025_01_15',
          won: true,
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });

    test('should fail when won is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_2025_01_15',
          guesses: ['A', 'B'],
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });
  });

  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.status, 'ok');
    });
  });

  describe('Groups API', () => {
    // Helper: create a db with users already registered, return db + app + tokens
    function setupGroupTest(usernames: string[]) {
      const db = new MockDatabase();
      for (const u of usernames) {
        // synchronously-safe because MockDatabase createUser is trivial
        db.createUser(u, 'password1234');
      }
      const app = createApp(db);
      const tokens: Record<string, string> = {};
      for (const u of usernames) {
        tokens[u] = generateAuthToken(u);
      }
      return { db, app, tokens };
    }

    describe('POST /api/groups', () => {
      test('should create a group and auto-add creator as member', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        const res = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Test Group' })
          .expect(200);

        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.group.name, 'Test Group');
        assert.strictEqual(res.body.group.creatorUsername, 'alice');
        assert.ok(typeof res.body.group.id === 'number');

        // Verify creator is a member by fetching the group
        const detailRes = await request(app)
          .get(`/api/groups/${res.body.group.id}`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(200);

        assert.ok(detailRes.body.group.members.includes('alice'));
      });

      test('should reject when not authenticated', async () => {
        const { app } = setupGroupTest(['alice']);

        await request(app)
          .post('/api/groups')
          .send({ name: 'Test Group' })
          .expect(401);
      });

      test('should reject empty group name', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: '' })
          .expect(400);

        await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({})
          .expect(400);
      });
    });

    describe('GET /api/groups', () => {
      test('should list only groups the user belongs to', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        // Alice creates two groups
        await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Group A' })
          .expect(200);

        await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Group B' })
          .expect(200);

        // Bob creates one group
        await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.bob}`)
          .send({ name: 'Group C' })
          .expect(200);

        // Alice should see 2 groups
        const aliceGroups = await request(app)
          .get('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(200);

        assert.strictEqual(aliceGroups.body.groups.length, 2);

        // Bob should see 1 group
        const bobGroups = await request(app)
          .get('/api/groups')
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(200);

        assert.strictEqual(bobGroups.body.groups.length, 1);
        assert.strictEqual(bobGroups.body.groups[0].name, 'Group C');
      });

      test('should reject when not authenticated', async () => {
        const { app } = setupGroupTest(['alice']);

        await request(app)
          .get('/api/groups')
          .expect(401);
      });
    });

    describe('GET /api/groups/:id', () => {
      test('should return group details with members for a member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'My Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Bob can view group details
        const res = await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(200);

        assert.strictEqual(res.body.group.name, 'My Group');
        assert.strictEqual(res.body.group.creatorUsername, 'alice');
        assert.ok(res.body.group.members.includes('alice'));
        assert.ok(res.body.group.members.includes('bob'));
      });

      test('should return 403 for non-member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Private Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Bob is not a member, should get 403
        await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should return 404 for non-existent group', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        await request(app)
          .get('/api/groups/9999')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(404);
      });
    });

    describe('DELETE /api/groups/:id', () => {
      test('should allow creator to delete group', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Doomed Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        await request(app)
          .delete(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(200);

        // Verify group is gone
        await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(404);
      });

      test('should reject deletion by non-creator member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Protected Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob as member
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Bob cannot delete — only creator can
        await request(app)
          .delete(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should reject deletion by non-member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Some Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Bob is not a member and not the creator
        await request(app)
          .delete(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should return 404 for non-existent group', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        await request(app)
          .delete('/api/groups/9999')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(404);
      });
    });

    describe('POST /api/groups/:id/members', () => {
      test('should allow a member to add another user', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Open Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Alice adds bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Verify bob is now a member
        const detailRes = await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(200);

        assert.ok(detailRes.body.group.members.includes('bob'));
      });

      test('should allow a non-creator member to add another user', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob', 'charlie']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Shared Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Alice adds bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Bob (non-creator member) adds charlie
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .send({ username: 'charlie' })
          .expect(200);

        // Verify charlie is a member
        const detailRes = await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.charlie}`)
          .expect(200);

        assert.ok(detailRes.body.group.members.includes('charlie'));
      });

      test('should reject adding by a non-member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob', 'charlie']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Closed Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Bob is not a member, tries to add charlie
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .send({ username: 'charlie' })
          .expect(403);
      });

      test('should return 409 when adding user already in group', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Dup Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Try adding bob again
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(409);
      });

      test('should return 404 when adding non-existent user', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Test Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'ghost' })
          .expect(404);
      });

      test('should return 404 for non-existent group', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        await request(app)
          .post('/api/groups/9999/members')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(404);
      });
    });

    describe('DELETE /api/groups/:id/members/:username', () => {
      test('should allow a user to remove themselves (leave)', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Leave Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Bob removes himself
        await request(app)
          .delete(`/api/groups/${groupId}/members/bob`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(200);

        // Bob is no longer a member
        await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should allow creator to remove another member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Kick Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        // Alice (creator) removes bob
        await request(app)
          .delete(`/api/groups/${groupId}/members/bob`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(200);

        // Bob is no longer a member
        await request(app)
          .get(`/api/groups/${groupId}`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should reject non-creator member removing another member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob', 'charlie']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'No Kick Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Add bob and charlie
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'bob' })
          .expect(200);

        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ username: 'charlie' })
          .expect(200);

        // Bob tries to remove charlie — should fail (not creator, not self)
        await request(app)
          .delete(`/api/groups/${groupId}/members/charlie`)
          .set('Authorization', `Bearer ${tokens.bob}`)
          .expect(403);
      });

      test('should return 404 when removing user who is not a member', async () => {
        const { app, tokens } = setupGroupTest(['alice', 'bob']);

        const createRes = await request(app)
          .post('/api/groups')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .send({ name: 'Test Group' })
          .expect(200);

        const groupId = createRes.body.group.id;

        // Alice tries to remove bob, but bob was never added
        await request(app)
          .delete(`/api/groups/${groupId}/members/bob`)
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(404);
      });

      test('should return 404 for non-existent group', async () => {
        const { app, tokens } = setupGroupTest(['alice']);

        await request(app)
          .delete('/api/groups/9999/members/alice')
          .set('Authorization', `Bearer ${tokens.alice}`)
          .expect(404);
      });
    });
  });
});
