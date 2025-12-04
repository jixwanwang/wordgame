# Optional Authentication for Puzzle Endpoint

## Overview

The `/api/puzzle` endpoint now supports optional authentication. This means:
- ✅ Works without authentication (public access)
- ✅ Accepts authentication tokens if provided
- ✅ Returns token status information to the client
- ✅ Never blocks puzzle access due to token issues

## How It Works

### Without Token
```bash
curl http://localhost:3000/api/puzzle
```

**Response:**
```json
{
  "id": "puzzle_2025_01_15",
  "date": "2025-01-15",
  "letters": ["A", "B", "C", "D", "E", "F", "G"],
  "centerLetter": "D",
  "maxScore": 100
}
```

### With Valid Token
```bash
curl http://localhost:3000/api/puzzle \
  -H "Authorization: Bearer <valid-token>"
```

**Response:**
```json
{
  "id": "puzzle_2025_01_15",
  "date": "2025-01-15",
  "letters": ["A", "B", "C", "D", "E", "F", "G"],
  "centerLetter": "D",
  "maxScore": 100,
  "auth": {
    "username": "johndoe",
    "tokenStatus": "valid"
  }
}
```

### With Expired Token
```bash
curl http://localhost:3000/api/puzzle \
  -H "Authorization: Bearer <expired-token>"
```

**Response:**
```json
{
  "id": "puzzle_2025_01_15",
  "date": "2025-01-15",
  "letters": ["A", "B", "C", "D", "E", "F", "G"],
  "centerLetter": "D",
  "maxScore": 100,
  "auth": {
    "username": undefined,
    "tokenStatus": "expired"
  }
}
```

**✨ Key Point:** The puzzle data is returned successfully, but the client is informed that the token has expired.

### With Invalid Token
```bash
curl http://localhost:3000/api/puzzle \
  -H "Authorization: Bearer invalid-malformed-token"
```

**Response:**
```json
{
  "id": "puzzle_2025_01_15",
  "date": "2025-01-15",
  "letters": ["A", "B", "C", "D", "E", "F", "G"],
  "centerLetter": "D",
  "maxScore": 100,
  "auth": {
    "username": undefined,
    "tokenStatus": "invalid"
  }
}
```

## Token Status Values

| Status | Meaning |
|--------|---------|
| `missing` | No token provided (internal only, not returned to client) |
| `valid` | Token is valid and not expired |
| `expired` | Token signature is valid but token has expired |
| `invalid` | Token is malformed or has invalid signature |

## Client Implementation Guide

### JavaScript/TypeScript Example

```typescript
interface PuzzleResponse {
  id: string;
  date: string;
  letters: string[];
  centerLetter: string;
  maxScore: number;
  auth?: {
    username?: string;
    tokenStatus: 'valid' | 'expired' | 'invalid';
  };
}

async function fetchPuzzle(token?: string): Promise<PuzzleResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/puzzle', { headers });
  const data = await response.json();

  // Handle token expiration
  if (data.auth?.tokenStatus === 'expired') {
    console.warn('Token expired, user should re-login');
    // Trigger token refresh or re-login flow
    await refreshToken();
  }

  return data;
}
```

### React Hook Example

```typescript
function usePuzzle() {
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    async function loadPuzzle() {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/puzzle', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json();
      setPuzzle(data);

      // Check if token needs refresh
      if (data.auth?.tokenStatus === 'expired') {
        setNeedsRefresh(true);
      }
    }

    loadPuzzle();
  }, []);

  return { puzzle, needsRefresh };
}
```

## Best Practices

### For Clients

1. **Always include the token if available** - Even if it might be expired, the server will tell you
2. **Check `auth.tokenStatus` in responses** - Use it to trigger re-authentication flows
3. **Don't block on token issues** - The puzzle data is still usable
4. **Implement silent token refresh** - When you see `expired`, refresh in the background

### For the Server

The optional authentication middleware (`optionalAuthenticateToken`):
- ✅ Never returns error responses
- ✅ Sets `req.tokenStatus` for route handlers to check
- ✅ Sets `req.user` only if token is valid
- ✅ Allows the route handler to decide what to do with the token status

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/puzzle
       │ (with/without token)
       ▼
┌──────────────────────────┐
│ optionalAuthenticateToken│
│  - Checks token if exists│
│  - Sets tokenStatus      │
│  - Never fails           │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   Puzzle Route Handler   │
│  - Returns puzzle data   │
│  - Includes auth status  │
└──────────┬───────────────┘
           │
           ▼
     ┌─────────┐
     │ Response│
     └─────────┘
```

## Why This Approach?

1. **User-Friendly**: Users can always access puzzles, even with expired tokens
2. **Informative**: Clients know when to refresh tokens without errors
3. **Flexible**: Future features can use the auth info if needed (e.g., personalized puzzles)
4. **Progressive Enhancement**: Anonymous users get full functionality, authenticated users get extras
