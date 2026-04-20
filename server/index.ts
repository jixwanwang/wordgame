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
} from "./auth.js";
import { NUM_GUESSES } from "@shared/lib/game-utils.js";
import { getPuzzleByDate, getTodaysPuzzle } from "./puzzles.js";
import { compareDates } from "../lib/puzzle-lookup.js";
import type { GameGrid } from "../lib/puzzles_types.js";
import type { SavedGameState } from "../lib/schema.js";
import { convertHistoryToResults } from "./history-converter.js";
import { computeStatsFromHistory, computeCurrentStreakFromHistory, computeCurrentLoseStreakFromHistory } from "./stats.js";
import { getTodayInPacificTime, areConsecutiveDays } from "../lib/time-utils.js";
import { createPerUserLimiter } from "./rate-limit.js";

/**
 * Create and configure the Express app with dependencies injected
 */
export function createApp(db: Database) {
  const app = express();

  // Trust the first proxy hop (Nginx) so req.ip reflects the real client.
  app.set("trust proxy", 1);

  // Per-user rate limiter for authenticated routes. Fresh state per app so
  // tests don't accumulate counts across cases.
  const perUserLimiter = createPerUserLimiter();

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
        const results = convertHistoryToResults(history, getTodayInPacificTime());
        for (const result of results) {
          try {
            // Uploaded history is treated as on-time (playedLate: false)
            await db.insertPuzzleResult(username, result.date, result.guesses, result.won, false);
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
            playedLate: false,
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
        const results = convertHistoryToResults(history, getTodayInPacificTime());
        for (const result of results) {
          try {
            // Uploaded history is treated as on-time (playedLate: false)
            await db.insertPuzzleResult(username, result.date, result.guesses, result.won, false);
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
   * Fetch the puzzle of the day (requires authentication)
   * Query params: date? (optional MM-DD-YYYY format, defaults to today), difficulty? (normal or hard, defaults to normal)
   * Headers: Authorization: Bearer <token>
   * Response: {
   *   id: string,
   *   date: string (MM-DD-YYYY),
   *   words: string[],
   *   grid: GameGrid,
   *   wordPositions: Record<string, [number, number][]>,
   *   savedState?: SavedGameState,
   *   currentStreak?: number
   * }
   *
   * Unauthenticated clients read puzzles from the static bundle directly; this
   * endpoint is authenticated so that unauth traffic never reaches the server.
   */
  app.get("/api/puzzle", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
    const requestedDate = req.query.date as string | undefined;
    const difficulty = (req.query.difficulty as "normal" | "hard" | undefined) || "normal";

    // Fetch puzzle based on date or get today's puzzle
    let puzzle;
    let puzzleDate;

    if (requestedDate) {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(requestedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use MM-DD-YYYY",
        });
      }
      if (compareDates(requestedDate, getTodayInPacificTime()) > 0) {
        return res.status(400).json({
          success: false,
          message: "cannot get puzzle for the future",
        });
      }

      puzzle = getPuzzleByDate(requestedDate, difficulty);
      puzzleDate = requestedDate;
    } else {
      puzzle = getTodaysPuzzle(difficulty);
      puzzleDate = getTodayInPacificTime();
    }

    if (puzzle === null) {
      return res.status(404).json({
        success: false,
        message: "No puzzle available for this date",
      });
    }

    interface PuzzleResponse {
      id: string;
      date: string;
      words: string[];
      grid: GameGrid;
      wordPositions: Record<string, [number, number][]>;
      currentStreak?: number;
      savedState?: SavedGameState;
    }

    const response: PuzzleResponse = {
      id: `puzzle_${puzzleDate.replace(/-/g, "_")}`,
      date: puzzleDate,
      words: puzzle.words,
      grid: puzzle.grid,
      wordPositions: puzzle.wordPositions,
    };

    if (req.user == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    const username = req.user.username;
    try {
      const userStats = await db.getUserStats(username);
      if (userStats) {
        response.currentStreak = userStats.currentStreak;
      }

      const userResult = await db.getPuzzleResult(username, puzzleDate);
      if (userResult) {
        response.savedState = {
          date: userResult.date,
          guessesRemaining: NUM_GUESSES - userResult.numGuesses,
          guesses: userResult.guesses,
          isComplete: true,
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

    return res.json(response);
  });

  /**
   * POST /api/submit
   * Submit a result for the puzzle of the day (requires authentication)
   * Request headers: Authorization: Bearer <token>
   * Request body: { puzzleId: string, guesses: string[], won: boolean }
   * Response: { success: boolean, message?: string }
   */
  app.post("/api/submit", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
    const { puzzleId, guesses, won } = req.body;

    if (req.user == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    const username = req.user.username;

    if (puzzleId == null || guesses == null || won == null) {
      return res.status(400).json({
        success: false,
        message: "puzzleId, guesses, and won are required",
      });
    }

    try {
      // Extract date from puzzleId (format: puzzle_MM_DD_YYYY)
      const datePart = puzzleId.replace("puzzle_", "").replace(/_/g, "-");

      if (!/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
        return res.status(400).json({
          success: false,
          message: "Invalid puzzleId",
        });
      }

      // Reject submissions dated in the future — guards against misbehaving clients.
      const today = getTodayInPacificTime();
      if (compareDates(datePart, today) > 0) {
        return res.status(400).json({
          success: false,
          message: "cannot submit a result for a future date",
        });
      }

      // Determine if the puzzle is being played after its day (historical play)
      const playedLate = datePart !== today;

      // Get current user stats to check if they've already submitted for this date
      const currentStats = await db.getUserStats(username);

      // Check if user has already submitted for today's puzzle (only relevant for on-time plays)
      if (!playedLate && currentStats != null && currentStats.lastCompletedDate === datePart) {
        // User has already submitted for this date, don't update streak
        // But still allow the result to be stored (insertPuzzleResult uses onConflictDoNothing)
        await db.insertPuzzleResult(username, datePart, guesses, won, false);

        return res.json({
          success: true,
          streak: currentStats.currentStreak,
        });
      }

      // Store result in database
      await db.insertPuzzleResult(username, datePart, guesses, won, playedLate);

      if (playedLate) {
        // Historical play: do not update streak or lastCompletedDate
        return res.json({
          success: true,
          streak: currentStats?.currentStreak ?? 0,
        });
      }

      // Calculate new streak (only for today's puzzle)
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
  app.get("/api/history", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
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
   * GET /api/lose-streak
   * Get the current lose streak for the authenticated user.
   * A lose streak requires at least 2 consecutive losses. Returns 0 otherwise.
   * Not stored in the database — computed on the fly from puzzle results.
   * Headers: Authorization: Bearer <token>
   * Response: { success: boolean, loseStreak: number }
   */
  app.get("/api/lose-streak", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const results = await db.getAllPuzzleResults(username);
      const loseStreak = computeCurrentLoseStreakFromHistory(results);

      return res.json({
        success: true,
        loseStreak,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to compute lose streak",
      });
    }
  });

  /**
   * POST /api/refresh-token
   * Refresh the user's auth token
   * Headers: Authorization: Bearer <token>
   * Response: { success: boolean, token?: string, message?: string }
   */
  app.post("/api/refresh-token", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
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
  app.get("/api/auth/validate", authenticateToken, perUserLimiter, async (_req: Request, res: Response) => {
    // If we reach here, the token is valid (authenticateToken middleware succeeded)
    return res.json({ valid: true });
  });

  /**
   * POST /api/feedback
   * Submit user feedback (requires authentication)
   * Request headers: Authorization: Bearer <token>
   * Request body: { feedback: string }
   * Response: { success: boolean, message?: string }
   */
  app.post("/api/feedback", authenticateToken, perUserLimiter, async (req: Request, res: Response) => {
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const rawFeedback = req.body.feedback;

    if (rawFeedback == null || typeof rawFeedback !== "string" || rawFeedback.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Feedback text is required",
      });
    }

    const feedback = rawFeedback.trim();

    if (feedback.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be 500 characters or less",
      });
    }

    try {
      await db.saveFeedback(username, feedback);
      return res.json({
        success: true,
        message: "Feedback submitted successfully",
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit feedback",
      });
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
