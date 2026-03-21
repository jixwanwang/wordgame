# Scripts

## npm Scripts (`package.json`)

| Script | Command | Description |
|---|---|---|
| `dev` | `NODE_ENV=development tsx server/start.ts` | Run server with hot-reload |
| `dev:client` | `vite` | Run Vite dev server |
| `build` | `vite build && esbuild server/start.ts ...` | Build client + bundle server |
| `test` | `node --import tsx --test client/src/**/*.test.ts` | Run client tests |
| `test:server` | `node --import tsx --test server/**/*.test.ts` | Run server tests |
| `db:push` | `bash scripts/db-push.sh` | Push schema changes to PostgreSQL |
| `lint` | `eslint . --ext .ts,.tsx,.js,.jsx` | Lint all TypeScript/JavaScript |

## Shell Scripts (`scripts/`)

### Development

| Script | Purpose |
|---|---|
| `dev-local.sh` | Helper to start both server and client locally |
| `dev-vm.sh` | Start dev environment on the GCP VM |
| `ssh.sh` | SSH into the GCP VM |

### Deployment

| Script | Purpose |
|---|---|
| `build.sh` | Build client and server |
| `deploy-full.sh` | One-command deployment: builds, uploads, runs VM-side deploy, and health checks |
| `deploy.sh` | Build and upload code to VM (does not restart the app) |
| `deploy-on-vm.sh` | Steps that run on the VM side during deployment |

### Infrastructure Setup (run once)

| Script | Purpose |
|---|---|
| `setup-gcp.sh` | Create and configure GCP VM instance |
| `setup-vm.sh` | Install Node.js, PM2, and dependencies on the VM |
| `setup-nginx.sh` | Configure Nginx as a reverse proxy |
| `setup-ssl.sh` | Provision SSL certificates via Let's Encrypt |

### Database

| Script | Purpose |
|---|---|
| `db-push.sh` | Runs `drizzle-kit push` to apply schema changes |
| `scripts/DB_README.md` | Notes on database setup and management |
| `scripts/process-feedback.ts` | Review recent feedback, update dictionaries, and regenerate word lists |
| `scripts/process-feedback.sh` | Wrapper to run the feedback review script without `npx` |

Feedback review script (runs with `tsx`):

```
./scripts/process-feedback.sh --days 7
```

Optional flags:
- `--days <n>`: Number of days to look back (default: 7)
- `--limit <n>`: Max feedback rows to load
- `--deploy`: Run build + deploy steps (currently disabled in script)

### Puzzle Generation

| Script | Purpose |
|---|---|
| `gen_puzzle.ts` | Generates new daily puzzles and migrates old ones to historical storage |
| `scripts/gen-puzzle.sh` | Wrapper around `gen_puzzle.ts` with a default count |

```
npx tsx gen_puzzle.ts [count]   # default: 90 puzzles
```

Shell wrapper (same default):

```
./scripts/gen-puzzle.sh [count]
```

This script generates `count` new normal-difficulty puzzles starting 3 days from today, archives past puzzles to `lib/puzzles_normal_historical.ts`, and writes the updated puzzle list to `lib/puzzles_normal.ts`. See [Gameplay Mechanics — Puzzle Generation](../gameplay/mechanics.md#puzzle-generation) for details.

### Data Generation (TypeScript)

| Script | Purpose |
|---|---|
| `scripts/validate-dictionary.ts` | Validates the word lists for consistency |

These TypeScript scripts are run directly with `tsx`:

```
npx tsx scripts/validate-dictionary.ts
```
