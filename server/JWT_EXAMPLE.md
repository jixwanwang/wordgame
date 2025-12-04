# JWT Authentication Example

This document demonstrates how to use JWT authentication with the word game API.

## 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"mypassword123"}'
```

**Response:**
```json
{
  "success": true,
  "username": "johndoe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful"
}
```

## 2. Login with Existing User

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"mypassword123"}'
```

**Response:**
```json
{
  "success": true,
  "username": "johndoe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

## 3. Submit a Puzzle Result (Requires JWT)

```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "puzzleId":"puzzle_2025_01_15",
    "score":85,
    "words":["BAD","DAD","ADD","DEAD","BEAD"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Result submitted successfully",
  "ranking": 42
}
```

## JWT Token Details

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 7 days
- **Payload**: Contains username and standard JWT claims (iat, exp)
- **Secret**: Configured via `JWT_SECRET` environment variable (defaults to dev secret)

## JWT Token Payload

When decoded, a JWT token contains:

```json
{
  "username": "johndoe",
  "iat": 1234567890,  // Issued at timestamp
  "exp": 1235172690   // Expiration timestamp
}
```

## Authentication Errors

### Missing Token
```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"puzzleId":"puzzle_2025_01_15","score":85,"words":["BAD"]}'
```

**Response (401):**
```json
{
  "success": false,
  "message": "Authentication token required"
}
```

### Invalid Token
```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-here" \
  -d '{"puzzleId":"puzzle_2025_01_15","score":85,"words":["BAD"]}'
```

**Response (403):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

## Environment Variables

Set the JWT secret in production:

```bash
export JWT_SECRET="your-secure-random-secret-key"
npm start
```

**⚠️ Important**: Never use the default JWT secret in production!
