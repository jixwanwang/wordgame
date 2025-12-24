import express from "express";
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
import { getPuzzleByDate, getTodaysPuzzle } from "./puzzles.js";
import { convertHistoryToResults } from "./history-converter.js";
import type { GameHistory } from "../lib/schema.js";
import { computeStatsFromHistory } from "./stats.js";

/**
 * Create and configure the Express app with dependencies injected
 */
export function createApp(db: Database) {
  const app = express();

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
      console.log(error);
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
          }
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
      console.log(error);
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
   *   userResult?: { guesses: string[], numGuesses: number, won: boolean, submittedAt: Date }
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
      const today = new Date();
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
      // Get today's date in MM-DD-YYYY format
      const today = new Date();
      puzzleDate = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}-${today.getFullYear()}`;
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

    // If user is authenticated, fetch their result for this puzzle
    if (req.user?.username) {
      try {
        const userResult = await db.getPuzzleResult(req.user.username, puzzleDate);
        if (userResult) {
          response.userResult = {
            guesses: userResult.guesses,
            numGuesses: userResult.numGuesses,
            won: userResult.won,
            submittedAt: userResult.submittedAt,
          };
        }
      } catch (error) {
        console.error("Error fetching user result:", error);
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

      // TODO: Validate words against puzzle
      // TODO: Calculate actual score
      // TODO: Calculate actual ranking

      // Store result in database
      await db.insertPuzzleResult(username, datePart, guesses, won);

      return res.json({
        success: true,
      });
    } catch (error) {
      console.log(error);
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

      return res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch history",
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
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    console.log("Using PostgreSQL database");
    return new PostgresDatabase(databaseUrl);
  } else {
    console.log("Using StubDatabase (in-memory) - set DATABASE_URL to use PostgreSQL");
    return new StubDatabase();
  }
}

// Create app with appropriate database
const app = createApp(initializeDatabase());

// Export app for testing and production use
export { app };
