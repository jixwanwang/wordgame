import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import type { Database, PuzzleResult, UserStats } from './db.js';
import { generateAuthToken, verifyAuthToken } from './auth.js';
import { getTodayInPacificTime } from './time-utils.js';

// Mock database for testing
class MockDatabase implements Database {
  private users = new Map<string, { originalUsername: string; password: string }>();
  private results = new Map<string, PuzzleResult>();
  private userStats = new Map<string, UserStats>();

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
    const lowerUsername = username.toLowerCase();
    const key = `${lowerUsername}_${date}`;
    return this.results.get(key) || null;
  }

  async getAllPuzzleResults(username: string): Promise<PuzzleResult[]> {
    const lowerUsername = username.toLowerCase();
    const results: PuzzleResult[] = [];
    for (const result of this.results.values()) {
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
    playedLate: boolean,
  ): Promise<void> {
    const lowerUsername = username.toLowerCase();
    const key = `${lowerUsername}_${date}`;
    if (this.results.has(key)) {
      return;
    }
    this.results.set(key, {
      username: lowerUsername,
      date,
      guesses,
      numGuesses: guesses.length,
      won,
      submittedAt: new Date(),
      playedLate,
    });
  }

  async getUserStats(username: string): Promise<UserStats | null> {
    const lowerUsername = username.toLowerCase();
    return this.userStats.get(lowerUsername) || null;
  }

  async updateUserStats(
    username: string,
    currentStreak: number,
    lastCompletedDate: string
  ): Promise<void> {
    const lowerUsername = username.toLowerCase();
    this.userStats.set(lowerUsername, {
      username,
      currentStreak,
      lastCompletedDate,
      updatedAt: new Date(),
    });
  }

  private feedbacks: { username: string; feedback: string }[] = [];

  async saveFeedback(username: string, feedback: string): Promise<void> {
    this.feedbacks.push({ username: username.toLowerCase(), feedback });
  }

  getFeedbacks() {
    return this.feedbacks;
  }

  // Test helper methods
  reset() {
    this.users.clear();
    this.results.clear();
    this.userStats.clear();
    this.feedbacks = [];
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
          password: '123456789',
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

      // Login doesn't validate username format, it just tries to authenticate
      // and returns 401 if the user doesn't exist
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
        .query({ date: '02-19-2026' }) // Use a specific date that exists in puzzles
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
        .query({ date: '02-19-2026' })
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

      // Create an expired token (with -1 second expiration)
      const expiredToken = jwt.sign(
        { username: 'testuser' },
        process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .get('/api/puzzle')
        .query({ date: '02-19-2026' })
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
        .query({ date: '02-19-2026' })
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
      const requestedDate = '02-19-2026';

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
    test('should successfully submit today\'s puzzle and increment streak', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const username = 'user123';
      const token = generateAuthToken(username);
      const today = getTodayInPacificTime();
      const puzzleId = `puzzle_${today.replace(/-/g, '_')}`;

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId,
          guesses: ['A', 'B', 'C'],
          won: true,
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(typeof response.body.streak, 'number');
      assert.strictEqual(response.body.streak, 1);

      // Verify result was stored in database
      const result = await db.getPuzzleResult(username, today);
      assert.ok(result);
      assert.deepStrictEqual(result.guesses, ['A', 'B', 'C']);
      assert.strictEqual(result.won, true);
      assert.strictEqual(result.playedLate, false);
    });

    test('should submit a historical puzzle without affecting streak', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const username = 'user123';
      const token = generateAuthToken(username);

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_01_15_2025',
          guesses: ['A', 'B', 'C'],
          won: true,
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      // Streak should not be incremented for a historical play
      assert.strictEqual(response.body.streak, 0);

      // Verify result was stored with playedLate: true
      const result = await db.getPuzzleResult(username, '01-15-2025');
      assert.ok(result);
      assert.deepStrictEqual(result.guesses, ['A', 'B', 'C']);
      assert.strictEqual(result.won, true);
      assert.strictEqual(result.playedLate, true);

      // Verify user stats were NOT updated
      const stats = await db.getUserStats(username);
      assert.strictEqual(stats, null);
    });

    test('should fail when JWT token is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/submit')
        .send({
          puzzleId: 'puzzle_01_15_2025',
          guesses: ['A', 'B'],
          won: false,
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
          score: 75,
          words: ['BAD', 'DAD'],
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
          score: 75,
          words: ['BAD', 'DAD'],
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });

    test('should fail when score is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_2025_01_15',
          words: ['BAD', 'DAD'],
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });

    test('should fail when words array is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          puzzleId: 'puzzle_2025_01_15',
          score: 75,
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('required'));
    });
  });

  describe('POST /api/feedback', () => {
    test('should submit feedback when authenticated', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: 'MISSING WORD: example' })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Feedback submitted successfully');

      const feedbacks = db.getFeedbacks();
      assert.strictEqual(feedbacks.length, 1);
      assert.strictEqual(feedbacks[0].feedback, 'MISSING WORD: example');
      assert.strictEqual(feedbacks[0].username, 'user123');
    });

    test('should fail when not authenticated', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/feedback')
        .send({ feedback: 'some feedback' })
        .expect(401)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
    });

    test('should fail when feedback is empty', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: '' })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Feedback text is required');
    });

    test('should fail when feedback is missing', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Feedback text is required');
    });

    test('should fail when feedback exceeds 500 characters', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: 'a'.repeat(501) })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.message, 'Feedback must be 500 characters or less');
    });

    test('should trim whitespace from feedback', async () => {
      const db = new MockDatabase();
      await db.createUser('user123', 'password123');
      const app = createApp(db);
      const token = generateAuthToken('user123');

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: '  some feedback  ' })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      const feedbacks = db.getFeedbacks();
      assert.strictEqual(feedbacks[0].feedback, 'some feedback');
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
});
