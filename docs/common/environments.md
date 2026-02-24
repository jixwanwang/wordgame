# Environments

## Environment Variables

Defined in `.env` at the repo root (not checked in). The server reads these at runtime; Vite exposes `VITE_`-prefixed variables to the client at build time.

| Variable | Used By | Description |
|---|---|---|
| `NODE_ENV` | Server | `development` or `production`; controls database selection |
| `PORT` | Server | HTTP server port (default: `3000`) |
| `DATABASE_URL` | Server | PostgreSQL connection string; required in production |
| `JWT_SECRET` | Server | Secret key for signing JWTs |
| `VITE_API_URL` | Client (build) | Base URL for API calls; defaults to `localhost:3000` in dev |
| `GCP_PROJECT_ID` | Scripts | GCP project for deployment |
| `GCP_VM_NAME` | Scripts | GCP VM instance name |
| `GCP_ZONE` | Scripts | GCP zone (e.g., `us-west1-b`) |

## Development

```
npm run dev          # starts Express server with tsx (hot-reload)
npm run dev:client   # starts Vite dev server on localhost:5173
```

Or run both with `bash run.sh`.

In development:
- `NODE_ENV=development` → server uses `StubDatabase` (in-memory, no PostgreSQL needed)
- Vite dev server proxies `/api/*` requests to `localhost:3000`
- CORS allows `localhost:5173` and `localhost:3000`
- No SSL, no PM2

## Production

The production environment runs on a GCP VM.

### Build

```
npm run build
```

This runs `vite build` (outputs client to `dist/public/`) then `esbuild` to bundle the server to `dist/start.js` as an ESM bundle.

### Runtime

- `NODE_ENV=production` → server uses `PostgresDatabase`
- Express serves the built client from `dist/public/` as static files
- PM2 manages the Node.js process (config: `ecosystem.config.js`)
- Nginx sits in front as a reverse proxy and handles SSL termination
- SSL certificates provisioned via Let's Encrypt (see `scripts/setup-ssl.sh`)
- Domain: `crosses.io`

### CORS in Production

Allowed origins are a hardcoded list: `crosses.io`, Cloudflare Workers staging and production URLs, and localhost ports for development.

## Testing

```
npm test              # runs client tests
npm run test:server   # runs server tests
```

Tests use Node's built-in `node:test` runner with `tsx` for TypeScript support. No Jest or Vitest.
