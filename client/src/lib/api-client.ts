/**
 * API client for authentication and game data
 */

import type { GameHistory } from "@shared/lib/schema";

// @ts-ignore - Vite env types
const API_BASE_URL = import.meta.env?.VITE_API_URL || "";

// Cookie helper functions
const cookies = {
  set(name: string, value: string, days: number = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  },

  get(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  delete(name: string) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict`;
  },
};

// Decode JWT payload (without verification - only for reading exp time)
function decodeJWT(token: string): { exp?: number; username?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Auth token management
export const Auth = {
  getToken(): string | null {
    return cookies.get("auth_token");
  },

  setToken(token: string) {
    cookies.set("auth_token", token, 30); // 30 days
  },

  clearToken() {
    cookies.delete("auth_token");
  },

  getUsername(): string | null {
    return cookies.get("username");
  },

  setUsername(username: string) {
    cookies.set("username", username, 30);
  },

  clearUsername() {
    cookies.delete("username");
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  },

  logout() {
    this.clearToken();
    this.clearUsername();
  },

  // Check if token expires in 5 days or less
  shouldRefreshToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return false;

    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000; // 5 days in ms

    return expiresAt - now <= fiveDays;
  },
};

// API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = Auth.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API response type with field errors
export interface AuthResponse {
  success: boolean;
  username?: string;
  token?: string;
  message?: string;
  errors?: Record<string, string>;
}

// API endpoints
export const API = {
  // Register a new user
  async register(username: string, password: string, history?: GameHistory): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/api/register", {
      method: "POST",
      body: JSON.stringify({ username, password, history }),
    });

    if (response.success && response.token && response.username) {
      Auth.setToken(response.token);
      Auth.setUsername(response.username);
    }

    return response;
  },

  // Login existing user
  async login(username: string, password: string, history?: GameHistory): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password, history }),
    });

    if (response.success && response.token && response.username) {
      Auth.setToken(response.token);
      Auth.setUsername(response.username);
    }

    return response;
  },

  // Get puzzle (optionally with auth)
  async getPuzzle(date?: string, difficulty?: "normal" | "hard") {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (difficulty) params.append("difficulty", difficulty);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{
      id: string;
      date: string;
      words: string[];
      grid: any;
      wordPositions: Record<string, [number, number][]>;
      auth?: {
        username?: string;
        tokenStatus: string;
      };
      userResult?: {
        guesses: string[];
        numGuesses: number;
        won: boolean;
        submittedAt: Date;
      };
    }>(`/api/puzzle${queryString}`);
  },

  // Submit puzzle result (requires auth)
  async submitResult(puzzleId: string, guesses: string[], won: boolean) {
    return apiRequest<{
      success: boolean;
      message?: string;
    }>("/api/submit", {
      method: "POST",
      body: JSON.stringify({ puzzleId, guesses, won }),
    });
  },

  // Get user's puzzle history (requires auth)
  async getHistory() {
    return apiRequest<{
      success: boolean;
      stats?: {
        firstGame: string;
        bestStreak: {
          dateEnded: string;
          streak: number;
        };
        bestGame: {
          date: string;
          guesses: number;
        };
        favoriteFirstGuess: {
          guess: string;
          percent: number;
        };
      };
      message?: string;
    }>("/api/history");
  },

  // Check if auth token is valid
  // Returns true if valid, false if expired/invalid
  async checkAuthToken(): Promise<boolean> {
    const token = Auth.getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/puzzle`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Token is valid if we don't get 401 or 403
      return response.status !== 401 && response.status !== 403;
    } catch (error) {
      console.error("Error checking auth token:", error);
      return false;
    }
  },

  // Refresh the auth token
  async refreshToken(): Promise<boolean> {
    try {
      const response = await apiRequest<{ success: boolean; token?: string }>("/api/refresh-token", {
        method: "POST",
      });

      if (response.success && response.token) {
        Auth.setToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  },
};
