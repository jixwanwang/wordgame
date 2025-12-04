import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import type { Database, PuzzleResult } from './db.js';
import { generateAuthToken, verifyAuthToken } from './auth.js';

// Mock database for testing
class MockDatabase implements Database {
  private users = new Map<string, { originalUsername: string; password: string }>();
  private results = new Map<string, PuzzleResult>();

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

  async insertPuzzleResult(
    username: string,
    date: string,
    score: number,
    words: string[]
  ): Promise<void> {
    const key = `${username}_${date}`;
    this.results.set(key, {
      username,
      date,
      score,
      words,
      submittedAt: new Date(),
    });
  }

  // Test helper methods
  reset() {
    this.users.clear();
    this.results.clear();
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
      assert.ok(response.body.message.includes('at least 3 characters'));
    });

    test('should fail when username is too long', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'a'.repeat(21),
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('at most 20 characters'));
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
      assert.ok(response.body.message.includes('letters and numbers'));
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
      assert.ok(response.body.message.includes('letters and numbers'));
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
      assert.ok(response.body.message.includes('letters and numbers'));
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
      assert.ok(response.body.message.includes('at least 6 characters'));
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
      assert.ok(response.body.message.includes('required'));
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
      assert.ok(response.body.message.includes('required'));
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

      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'user@name',
          password: 'password123',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('letters and numbers'));
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
      assert.ok(response.body.message.includes('required'));
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
        .query({ date: '2025-10-27' }) // Use a specific date that exists in puzzles
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
        .query({ date: '2025-10-27' })
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
        .query({ date: '2025-10-27' })
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
        .query({ date: '2025-10-27' })
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
      const requestedDate = '2025-10-28';

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
        .query({ date: '2020-01-01' }) // Date with no puzzle
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
          score: 75,
          words: ['BAD', 'DAD', 'ADD'],
        })
        .expect(200)
        .expect('Content-Type', /json/);

      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.message);
      assert.ok(typeof response.body.ranking === 'number');
      assert.ok(response.body.ranking > 0);

      // Verify result was stored in database
      const result = await db.getPuzzleResult(username, '2025-01-15');
      assert.ok(result);
      assert.strictEqual(result.score, 75);
      assert.deepStrictEqual(result.words, ['BAD', 'DAD', 'ADD']);
    });

    test('should fail when JWT token is missing', async () => {
      const db = new MockDatabase();
      const app = createApp(db);

      const response = await request(app)
        .post('/api/submit')
        .send({
          puzzleId: 'puzzle_2025_01_15',
          score: 75,
          words: ['BAD', 'DAD'],
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
