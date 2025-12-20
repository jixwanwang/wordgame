# Frontend Authentication Setup

This document explains how to use the authentication system in the frontend.

## Components

### `AuthModal`

Modal component for user login and registration.

**Usage:**
```tsx
import { AuthModal } from "@/components/auth-modal";

function MyComponent() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <button onClick={() => setShowAuth(true)}>Log in</button>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={(username) => {
          console.log("Logged in as:", username);
          // Optional: handle successful auth
        }}
      />
    </>
  );
}
```

### `AuthButton`

Pre-built button component that shows login/logout state.

**Usage:**
```tsx
import { AuthButton } from "@/components/auth-button";

function Header() {
  return (
    <div className="flex justify-between items-center p-4">
      <h1>My Game</h1>
      <AuthButton />
    </div>
  );
}
```

## API Client

### Authentication Functions

```tsx
import { auth, api } from "@/lib/api-client";

// Check if user is logged in
if (auth.isAuthenticated()) {
  console.log("Logged in as:", auth.getUsername());
}

// Manual login
try {
  const response = await api.login("username", "password");
  if (response.success) {
    console.log("Logged in!");
  }
} catch (error) {
  console.error("Login failed:", error.message);
}

// Manual registration
try {
  const response = await api.register("username", "password");
  if (response.success) {
    console.log("Account created!");
  }
} catch (error) {
  console.error("Registration failed:", error.message);
}

// Logout
auth.logout();
```

### API Endpoints

```tsx
import { api } from "@/lib/api-client";

// Get today's puzzle (works with or without auth)
const puzzle = await api.getPuzzle();

// Get specific date puzzle
const puzzle = await api.getPuzzle("2025-01-15");

// Submit result (requires authentication)
await api.submitResult("puzzle_2025_01_15", ["WORD", "GUESS"]);
```

### Token Management

The API client automatically:
- Stores JWT token in cookies (30 day expiration)
- Includes token in Authorization header for authenticated requests
- Stores username in cookies for display

```tsx
import { auth } from "@/lib/api-client";

// Get current token
const token = auth.getToken();

// Get current username
const username = auth.getUsername();

// Check if authenticated
if (auth.isAuthenticated()) {
  // User is logged in
}

// Logout (clears token and username)
auth.logout();
```

## Environment Configuration

### Local Development

Set `VITE_API_URL` in `.env`:

```bash
VITE_API_URL=http://localhost:3000
```

The vite dev server will proxy `/api/*` requests to the backend.

### Production Build

For production, set the API URL to your deployed backend:

```bash
# Production .env
VITE_API_URL=http://136.118.23.174
# or
VITE_API_URL=https://yourdomain.com
```

When building:
```bash
npm run build
```

The built files will use the configured API URL.

## Example Integration

Here's a complete example integrating auth into a game page:

```tsx
import { useState, useEffect } from "react";
import { AuthButton } from "@/components/auth-button";
import { auth, api } from "@/lib/api-client";

export default function Game() {
  const [puzzle, setPuzzle] = useState(null);

  // Load puzzle on mount
  useEffect(() => {
    loadPuzzle();
  }, []);

  const loadPuzzle = async () => {
    try {
      const data = await api.getPuzzle();
      setPuzzle(data);

      // Check if user is authenticated
      if (data.auth?.username) {
        console.log("Playing as:", data.auth.username);
      }
    } catch (error) {
      console.error("Failed to load puzzle:", error);
    }
  };

  const handleSubmit = async (guesses: string[]) => {
    if (!auth.isAuthenticated()) {
      alert("Please log in to save your results");
      return;
    }

    try {
      await api.submitResult(puzzle.id, guesses);
      console.log("Result saved!");
    } catch (error) {
      console.error("Failed to save result:", error);
    }
  };

  return (
    <div>
      <header className="flex justify-between p-4">
        <h1>Word Game</h1>
        <AuthButton />
      </header>

      {/* Your game UI */}
    </div>
  );
}
```

## Cookie Storage

The authentication system uses cookies with the following settings:
- **Name**: `auth_token`, `username`
- **Expiration**: 30 days
- **Path**: `/`
- **SameSite**: `Strict`
- **HttpOnly**: No (accessible to JavaScript)

Cookies are automatically sent with API requests.

## Security Notes

1. **JWT Token**: Stored in cookies, automatically included in requests
2. **Password Requirements**: Minimum 6 characters (enforced by backend)
3. **Username Requirements**: 3-20 characters (enforced by backend)
4. **HTTPS**: Use HTTPS in production to secure cookies
5. **Token Expiration**: Tokens are valid for 7 days (backend setting)

## Error Handling

API errors are thrown as Error objects:

```tsx
try {
  await api.login("user", "pass");
} catch (error) {
  if (error instanceof Error) {
    // Display error.message to user
    console.error(error.message);
  }
}
```

Common error messages:
- "Username already exists" - Registration with existing username
- "Invalid username or password" - Login failed
- "Authentication required" - Trying to submit without being logged in
- "HTTP 401" - Invalid or expired token

## Testing

### Test Authentication Flow

1. Start backend: `npm run dev`
2. Start frontend: `npm run dev:client`
3. Click "Log in" button
4. Try registering a new account
5. Try logging in with created account
6. Verify username appears in header
7. Click logout
8. Verify logged out state

### Test API Integration

```tsx
// In browser console
import { api, auth } from "./src/lib/api-client";

// Register
await api.register("testuser", "password123");

// Check auth
console.log(auth.getUsername()); // "testuser"
console.log(auth.isAuthenticated()); // true

// Get puzzle
const puzzle = await api.getPuzzle();
console.log(puzzle);

// Submit result
await api.submitResult(puzzle.id, ["TEST", "WORDS"]);

// Logout
auth.logout();
console.log(auth.isAuthenticated()); // false
```
