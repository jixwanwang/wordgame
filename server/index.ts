import dotenv from "dotenv";

// Load environment variables from .env file before anything else
dotenv.config();

import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import type { Database } from "./db.js";
import { StubDatabase } from "./db.js";
import { PostgresDatabase } from "./postgres-db.js";
import {
  validateUsername,
  validatePassword,
  generateAuthToken,
  authenticateToken,
  optionalAuthenticateToken,
} from "./auth.js";
import { NUM_GUESSES } from "@shared/lib/game-utils.js";
import { getPuzzleByDate, getTodaysPuzzle } from "./puzzles.js";
import { convertHistoryToResults } from "./history-converter.js";
import { computeStatsFromHistory, computeCurrentStreakFromHistory } from "./stats.js";
import { getTodayInPacificTime, getNowInPacificTime, areConsecutiveDays } from "./time-utils.js";

/**
 * Create and configure the Express app with dependencies injected
 */
export function createApp(db: Database) {
  const app = express();

  // CORS configuration
  // Allow requests from Cloudflare Workers frontends
  const allowedOrigins = [
    "https://crosses-stg.jixuan-wang.workers.dev", // Staging
    "https://crosses.jixuan-wang.workers.dev", // Production (if exists)
    "https://crosses.io", // Production domain
    "http://localhost:5173", // Local development
    "http://localhost:3000", // Local development
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true, // Allow cookies and authorization headers
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Middleware
  app.use(express.json());

  /**
   * POST /api/register
   * Register a new user
   * Request body: { username: string, password: string, history?: GameHistory }
   * Response: { success: boolean, username?: string, token?: string, message?: string, errors?: Record<string, string> }
   */
  app.post("/api/register", async (req: Request, res: Response) => {
    const { username, password, history } = req.body;
    const errors: Record<string, string> = {};

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      errors.username = usernameValidation.error;
    }

    // Validate password format
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error;
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    try {
      // Check if user already exists
      const exists = await db.userExists(username);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
          errors: { username: "Username already exists" },
        });
      }

      // Create new user
      await db.createUser(username, password);

      // If history is provided, convert and save it
      if (history) {
        const results = convertHistoryToResults(history);
        for (const result of results) {
          try {
            await db.insertPuzzleResult(username, result.date, result.guesses, result.won);
          } catch (error) {
            // Log but don't fail registration if history sync fails
            console.error(`Failed to sync history for date ${result.date}:`, error);
          }
        }

        // Update user stats with streak and last completed date from uploaded history
        // Convert results to PuzzleResult format for streak computation
        try {
          const puzzleResults = results.map((result) => ({
            username,
            date: result.date,
            guesses: result.guesses,
            numGuesses: result.numGuesses,
            won: result.won,
            submittedAt: new Date(),
          }));
          const { currentStreak, lastCompletedDate } = computeCurrentStreakFromHistory(puzzleResults);
          if (lastCompletedDate) {
            await db.updateUserStats(username, currentStreak, lastCompletedDate);
          }
        } catch (error) {
          // Log but don't fail registration if stats update fails
          console.error(`Failed to update user stats for ${username}:`, error);
        }
      }

      // Generate auth token
      const token = generateAuthToken(username);

      return res.json({
        success: true,
        username,
        token,
        message: "Registration successful",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  /**
   * POST /api/login
   * Login an existing user
   * Request body: { username: string, password: string, history?: GameHistory }
   * Response: { success: boolean, username?: string, token?: string, message?: string, errors?: Record<string, string> }
   */
  app.post("/api/login", async (req: Request, res: Response) => {
    const { username, password, history } = req.body;
    const errors: Record<string, string> = {};

    // Validate password format (only check format, not correctness)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error;
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    try {
      // Validate credentials
      const isValid = await db.validateUser(username, password);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
          errors: { general: "Invalid username or password" },
        });
      }

      // Get the original username (with preserved casing) for the JWT token
      const originalUsername = await db.getOriginalUsername(username);

      if (!originalUsername) {
        // This should not happen if validateUser returned true
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }

      // If history is provided, convert and save it
      if (history) {
        const results = convertHistoryToResults(history);
        for (const result of results) {
          try {
            await db.insertPuzzleResult(username, result.date, result.guesses, result.won);
          } catch (error) {
            // Log but don't fail login if history sync fails
            console.error(`Failed to sync history for date ${result.date}:`, error);
            console.error("Error details:", error instanceof Error ? error.message : String(error));
          }
        }

        // Update user stats with streak and last completed date
        // For login, we need to fetch all results from DB because user might have games from other devices
        try {
          const allResults = await db.getAllPuzzleResults(username);
          const { currentStreak, lastCompletedDate } = computeCurrentStreakFromHistory(allResults);
          if (lastCompletedDate) {
            await db.updateUserStats(username, currentStreak, lastCompletedDate);
          }
        } catch (error) {
          // Log but don't fail login if stats update fails
          console.error(`Failed to update user stats for ${username}:`, error);
        }
      }

      // Generate auth token with original username
      const token = generateAuthToken(originalUsername);

      return res.json({
        success: true,
        username: originalUsername,
        token,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Stack trace:", error.stack);
      } else if (error && typeof error === "object") {
        console.error("Error object keys:", Object.keys(error));
        console.error("Error object:", JSON.stringify(error, null, 2));

        // For ErrorEvent or similar objects
        if ("message" in error) {
          console.error("Error.message:", (error as any).message);
        }
        if ("error" in error) {
          console.error("Error.error:", (error as any).error);
        }
      } else {
        console.error("Error (raw):", String(error));
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  /**
   * GET /api/puzzle
   * Fetch the puzzle of the day (optionally authenticated)
   * Query params: date? (optional MM-DD-YYYY format, defaults to today), difficulty? (normal or hard, defaults to normal)
   * Headers: Authorization: Bearer <token> (optional)
   * Response: {
   *   id: string,
   *   date: string (MM-DD-YYYY),
   *   words: string[],
   *   grid: GameGrid,
   *   wordPositions: Record<string, [number, number][]>,
   *   auth?: { username: string, tokenStatus: string },
   *   savedState?: SavedGameState,
   *   currentStreak?: number
   * }
   */
  app.get("/api/puzzle", optionalAuthenticateToken, async (req: Request, res: Response) => {
    const requestedDate = req.query.date as string | undefined;
    const difficulty = (req.query.difficulty as "normal" | "hard" | undefined) || "normal";

    // Fetch puzzle based on date or get today's puzzle
    let puzzle;
    let puzzleDate;

    if (requestedDate) {
      // Validate date format (MM-DD-YYYY)
      if (!/^\d{2}-\d{2}-\d{4}$/.test(requestedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use MM-DD-YYYY",
        });
      }
      const today = getNowInPacificTime();
      const [month, day, year] = requestedDate.split("-");
      if (
        parseInt(year) > today.getFullYear() ||
        (parseInt(year) === today.getFullYear() && parseInt(month) > today.getMonth() + 1) ||
        (parseInt(year) === today.getFullYear() &&
          parseInt(month) === today.getMonth() + 1 &&
          parseInt(day) > today.getDate())
      ) {
        return res.status(400).json({
          success: false,
          message: "cannot get puzzle for the future",
        });
      }

      puzzle = getPuzzleByDate(requestedDate, difficulty);
      puzzleDate = requestedDate;
    } else {
      puzzle = getTodaysPuzzle(difficulty);
      // Get today's date in Pacific Time in MM-DD-YYYY format
      puzzleDate = getTodayInPacificTime();
    }

    if (puzzle === null) {
      return res.status(404).json({
        success: false,
        message: "No puzzle available for this date",
      });
    }

    // Format response
    const response: any = {
      id: `puzzle_${puzzleDate.replace(/-/g, "_")}`,
      date: puzzleDate,
      words: puzzle.words,
      grid: puzzle.grid,
      wordPositions: puzzle.wordPositions,
    };

    // Include auth information if user is authenticated or if token was provided
    if (req.tokenStatus && req.tokenStatus !== "missing") {
      response.auth = {
        username: req.user?.username,
        tokenStatus: req.tokenStatus,
      };
    } else if (req.user) {
      // Valid authenticated user
      response.auth = {
        username: req.user.username,
        tokenStatus: "valid",
      };
    }

    // If user is authenticated, fetch their result and stats for this puzzle
    if (req.user?.username) {
      try {
        // Fetch user stats (includes current streak)
        const userStats = await db.getUserStats(req.user.username);
        if (userStats) {
          response.currentStreak = userStats.currentStreak;
        }

        // Fetch user result for this specific puzzle
        const userResult = await db.getPuzzleResult(req.user.username, puzzleDate);
        if (userResult) {
          // Convert PuzzleResult to SavedGameState format
          // Extract guessed letters (single character guesses)
          const guessedLetters = userResult.guesses.filter((g) => g.length === 1);

          response.savedState = {
            date: userResult.date,
            guessesRemaining: NUM_GUESSES - userResult.numGuesses,
            guessedLetters: guessedLetters,
            guesses: userResult.guesses,
            isComplete: true, // If result exists, game is complete
            wonGame: userResult.won,
          };
        }
      } catch (error) {
        console.error("Error fetching user result:", error);

        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Stack trace:", error.stack);
        } else if (error && typeof error === "object") {
          console.error("Error object:", JSON.stringify(error, null, 2));
        }
        // Don't fail the request if we can't fetch the result
      }
    }

    return res.json(response);
  });

  /**
   * POST /api/submit
   * Submit a result for the puzzle of the day (requires authentication)
   * Request headers: Authorization: Bearer <token>
   * Request body: { puzzleId: string, guesses: string[], won: boolean }
   * Response: { success: boolean, message?: string }
   */
  app.post("/api/submit", authenticateToken, async (req: Request, res: Response) => {
    const { puzzleId, guesses, won } = req.body;

    // Get username from JWT token
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validation
    if (puzzleId == null || guesses == null || won == null) {
      return res.status(400).json({
        success: false,
        message: "puzzleId, guesses, and won are required",
      });
    }

    try {
      // Extract date from puzzleId (format: puzzle_MM_DD_YYYY)
      const datePart = puzzleId.replace("puzzle_", "").replace(/_/g, "-");

      // Get current user stats to check if they've already submitted for this date
      const currentStats = await db.getUserStats(username);

      // Check if user has already submitted for this date
      if (currentStats != null && currentStats.lastCompletedDate === datePart) {
        // User has already submitted for this date, don't update streak
        // But still allow the result to be stored (insertPuzzleResult uses onConflictDoNothing)
        await db.insertPuzzleResult(username, datePart, guesses, won);

        return res.json({
          success: true,
          streak: currentStats.currentStreak,
        });
      }

      // Store result in database
      await db.insertPuzzleResult(username, datePart, guesses, won);

      // Calculate new streak
      let newStreak = 0;

      if (won) {
        // If they won, update or increment streak
        if (currentStats == null || currentStats.lastCompletedDate == null) {
          // No previous stats or no previous completion, start streak at 1
          newStreak = 1;
        } else {
          // Check if lastCompletedDate is the day before datePart
          if (areConsecutiveDays(currentStats.lastCompletedDate, datePart)) {
            // Consecutive win, increment streak
            newStreak = currentStats.currentStreak + 1;
          } else {
            // Non-consecutive win, reset streak to 1
            newStreak = 1;
          }
        }
      } else {
        // If they lost, reset streak to 0
        newStreak = 0;
      }

      // Update user stats with new streak and last completed date
      await db.updateUserStats(username, newStreak, datePart);

      return res.json({
        success: true,
        streak: newStreak,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit result",
      });
    }
  });

  /**
   * GET /api/history
   * Get all puzzle results for the authenticated user
   * Headers: Authorization: Bearer <token>
   * Response: { success: boolean, results?: PuzzleResult[], message?: string }
   */
  app.get("/api/history", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const results = await db.getAllPuzzleResults(username);

      const stats = computeStatsFromHistory(results);

      // Compute current streak from history and sync to database
      const { currentStreak, lastCompletedDate } = computeCurrentStreakFromHistory(results);

      // Update user_stats table with computed streak
      if (lastCompletedDate != null) {
        await db.updateUserStats(username, currentStreak, lastCompletedDate);
      }

      return res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch history",
      });
    }
  });

  /**
   * POST /api/refresh-token
   * Refresh the user's auth token
   * Headers: Authorization: Bearer <token>
   * Response: { success: boolean, token?: string, message?: string }
   */
  app.post("/api/refresh-token", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      // Generate a new token
      const token = generateAuthToken(username);

      return res.json({
        success: true,
        token,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to refresh token",
      });
    }
  });

  /**
   * GET /api/auth/validate
   * Validate the user's auth token
   * Headers: Authorization: Bearer <token>
   * Response: { valid: boolean }
   */
  app.get("/api/auth/validate", authenticateToken, async (_req: Request, res: Response) => {
    // If we reach here, the token is valid (authenticateToken middleware succeeded)
    return res.json({ valid: true });
  });

  // ---- Group endpoints ----

  /**
   * POST /api/groups
   * Create a new group. Creator is auto-added as member.
   */
  app.post("/api/groups", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { name } = req.body;
    if (name == null || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Group name is required" });
    }

    try {
      const group = await db.createGroup(name.trim(), username.toLowerCase());
      await db.addUserToGroup(group.id, username.toLowerCase());
      return res.json({ success: true, group });
    } catch (error) {
      console.error("Error creating group:", error);
      return res.status(500).json({ success: false, message: "Failed to create group" });
    }
  });

  /**
   * GET /api/groups
   * List groups the authenticated user belongs to.
   */
  app.get("/api/groups", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
      const groups = await db.getGroupsForUser(username.toLowerCase());
      return res.json({ success: true, groups });
    } catch (error) {
      console.error("Error listing groups:", error);
      return res.status(500).json({ success: false, message: "Failed to list groups" });
    }
  });

  /**
   * GET /api/groups/:id
   * Get group details with members. Only members can view.
   */
  app.get("/api/groups/:id", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    try {
      const group = await db.getGroup(groupId);
      if (group === null) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      const isMember = await db.isUserInGroup(groupId, username.toLowerCase());
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Not a member of this group" });
      }

      const members = await db.getGroupMembers(groupId);
      return res.json({ success: true, group: { ...group, members } });
    } catch (error) {
      console.error("Error getting group:", error);
      return res.status(500).json({ success: false, message: "Failed to get group" });
    }
  });

  /**
   * DELETE /api/groups/:id
   * Delete a group. Only the creator can delete.
   */
  app.delete("/api/groups/:id", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    try {
      const group = await db.getGroup(groupId);
      if (group === null) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      if (group.creatorUsername !== username.toLowerCase()) {
        return res.status(403).json({ success: false, message: "Only the group creator can delete the group" });
      }

      await db.deleteGroup(groupId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting group:", error);
      return res.status(500).json({ success: false, message: "Failed to delete group" });
    }
  });

  /**
   * POST /api/groups/:id/members
   * Add a member to a group. Only existing members can add others.
   */
  app.post("/api/groups/:id/members", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const { username: targetUsername } = req.body;
    if (targetUsername == null || typeof targetUsername !== "string") {
      return res.status(400).json({ success: false, message: "username is required" });
    }

    try {
      const group = await db.getGroup(groupId);
      if (group === null) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      const isMember = await db.isUserInGroup(groupId, username.toLowerCase());
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Not a member of this group" });
      }

      const targetLower = targetUsername.toLowerCase();

      const targetExists = await db.userExists(targetLower);
      if (!targetExists) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const alreadyMember = await db.isUserInGroup(groupId, targetLower);
      if (alreadyMember) {
        return res.status(409).json({ success: false, message: "User is already a member of this group" });
      }

      await db.addUserToGroup(groupId, targetLower);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error adding member:", error);
      return res.status(500).json({ success: false, message: "Failed to add member" });
    }
  });

  /**
   * DELETE /api/groups/:id/members/:username
   * Remove a member from a group. A user can remove themselves, or the creator can remove anyone.
   */
  app.delete("/api/groups/:id/members/:username", authenticateToken, async (req: Request, res: Response) => {
    const username = req.user?.username;
    if (username == null) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const targetUsername = req.params.username.toLowerCase();

    try {
      const group = await db.getGroup(groupId);
      if (group === null) {
        return res.status(404).json({ success: false, message: "Group not found" });
      }

      const callerLower = username.toLowerCase();
      const isSelf = callerLower === targetUsername;
      const isCreator = group.creatorUsername === callerLower;

      if (!isSelf && !isCreator) {
        return res.status(403).json({ success: false, message: "Only the group creator or the user themselves can remove a member" });
      }

      const targetIsMember = await db.isUserInGroup(groupId, targetUsername);
      if (!targetIsMember) {
        return res.status(404).json({ success: false, message: "User is not a member of this group" });
      }

      await db.removeUserFromGroup(groupId, targetUsername);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      return res.status(500).json({ success: false, message: "Failed to remove member" });
    }
  });

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return app;
}

// Initialize database based on environment
function initializeDatabase(): Database {
  const nodeEnv = process.env.NODE_ENV;
  const databaseUrl = process.env.DATABASE_URL;

  // In development mode, always use in-memory database
  if (nodeEnv === "development") {
    console.log("using stub database");
    return new StubDatabase();
  }

  // In production/other environments, use PostgreSQL if DATABASE_URL is set
  if (databaseUrl) {
    console.log("got database url", databaseUrl);
    return new PostgresDatabase(databaseUrl);
  } else {
    console.log("using stub database");
    return new StubDatabase();
  }
}

// Create app with appropriate database
const app = createApp(initializeDatabase());

// Export app for testing and production use
export { app };
