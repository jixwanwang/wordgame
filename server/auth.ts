import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SALT_ROUNDS = 10;

/**
 * JWT secret key - in production, this should be stored in environment variables
 * For development, we use a default secret
 */
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

/**
 * JWT expiration time - 15 days
 */
const JWT_EXPIRES_IN = "15d";

/**
 * JWT token payload
 */
export interface JWTPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Username validation regex - only ASCII letters and numbers
 * No special characters, spaces, or unicode characters allowed
 */
const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;

/**
 * Username constraints
 */
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 10;

export interface UsernameValidationError {
  valid: false;
  error: string;
}

export interface UsernameValidationSuccess {
  valid: true;
}

export type UsernameValidationResult = UsernameValidationSuccess | UsernameValidationError;

/**
 * Validate username format
 * - Must contain only ASCII letters and numbers (a-z, A-Z, 0-9)
 * - Must be between 3 and 20 characters
 * - No special characters, spaces, or unicode allowed
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (typeof username !== "string") {
    return { valid: false, error: "Username must be a string" };
  }

  if (username.length < MIN_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    };
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be at most ${MAX_USERNAME_LENGTH} characters`,
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: "Username can only contain letters and numbers (a-z, A-Z, 0-9)",
    };
  }

  return { valid: true };
}

/**
 * Validate password format
 */
export function validatePassword(password: string): UsernameValidationResult {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (typeof password !== "string") {
    return { valid: false, error: "Password must be a string" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Hash a plaintext password using bcrypt
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a hashed password
 */
export async function comparePassword(plaintext: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hashed);
}

/**
 * Generate a JWT auth token for a user
 */
export function generateAuthToken(username: string): string {
  const payload: JWTPayload = { username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, null if invalid
 */
export function verifyAuthToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extend Express User interface to include our user information
 * This is the standard way to add user fields when using Express
 */
declare global {
  namespace Express {
    interface User {
      username: string;
    }
    interface Request {
      user?: User;
    }
  }
}

/**
 * Express middleware to authenticate requests using JWT
 * Expects token in Authorization header: "Bearer <token>"
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token === null || token === undefined) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  const payload = verifyAuthToken(token);

  if (payload === null) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
    return;
  }

  // Attach user info to request
  // req.user is typed as Express.User which we've extended to include username
  req.user = { username: payload.username };
  next();
}

