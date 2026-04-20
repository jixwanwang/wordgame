import rateLimit from "express-rate-limit";
import type { Request } from "express";

/**
 * Per-user rate limit for authenticated routes.
 *
 * Must be applied AFTER `authenticateToken` so `req.user.username` is populated.
 * Excess requests are silently dropped (TCP socket destroyed — no HTTP response).
 *
 * Nginx handles per-IP limiting upstream; this layer defends against a single
 * authenticated user hammering the API from multiple IPs.
 */
export function createPerUserLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const username = req.user?.username;
      if (username == null) {
        throw new Error("perUserLimiter requires authenticateToken to run first");
      }
      return username;
    },
    handler: (_req, res) => {
      res.socket?.destroy();
    },
  });
}
