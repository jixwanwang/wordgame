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
   * Request body: { username: string, password: string }
   * Response: { success: boolean, username?: string, token?: string, message?: string }
   */
  app.post("/api/register", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.error,
      });
    }

    // Validate password format
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.error,
      });
    }

    try {
      // Check if user already exists
      const exists = await db.userExists(username);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Create new user
      await db.createUser(username, password);

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
   * Request body: { username: string, password: string }
   * Response: { success: boolean, username?: string, token?: string, message?: string }
   */
  app.post("/api/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.error,
      });
    }

    // Validate password format
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.error,
      });
    }

    try {
      // Validate credentials
      const isValid = await db.validateUser(username, password);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
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
   * Query params: date? (optional YYYY-MM-DD format, defaults to today)
   * Headers: Authorization: Bearer <token> (optional)
   * Response: {
   *   id: string,
   *   date: string,
   *   words: string[],
   *   grid: GameGrid,
   *   wordPositions: Record<string, [number, number][]>,
   *   auth?: { username: string, tokenStatus: string }
   * }
   */
  app.get("/api/puzzle", optionalAuthenticateToken, (req: Request, res: Response) => {
    const requestedDate = req.query.date as string | undefined;

    // Fetch puzzle based on date or get today's puzzle
    let puzzle;
    let puzzleDate;

    if (requestedDate) {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }
      puzzle = getPuzzleByDate(requestedDate);
      puzzleDate = requestedDate;
    } else {
      puzzle = getTodaysPuzzle();
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      puzzleDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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

    return res.json(response);
  });

  /**
   * POST /api/submit
   * Submit a result for the puzzle of the day (requires authentication)
   * Request headers: Authorization: Bearer <token>
   * Request body: { puzzleId: string, guesses: string[] }
   * Response: { success: boolean, message?: string }
   */
  app.post("/api/submit", authenticateToken, async (req: Request, res: Response) => {
    const { puzzleId, guesses } = req.body;

    // Get username from JWT token
    const username = req.user?.username;

    if (username == null) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validation
    if (puzzleId == null || guesses == null) {
      return res.status(400).json({
        success: false,
        message: "puzzleId is required",
      });
    }

    try {
      // Extract date from puzzleId (format: puzzle_YYYY_MM_DD)
      const datePart = puzzleId.replace("puzzle_", "").replace(/_/g, "-");

      // TODO: Validate words against puzzle
      // TODO: Calculate actual score
      // TODO: Calculate actual ranking

      // Store result in database
      await db.insertPuzzleResult(username, datePart, guesses, guesses.length < 15);

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
