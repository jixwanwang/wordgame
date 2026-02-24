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
| `deploy.sh` | Full deployment pipeline (build, upload, restart) |
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

### Data Generation (TypeScript)

| Script | Purpose |
|---|---|
| `scripts/generate-all-words.ts` | Generates the `lib/all_words.ts` dictionary file |
| `scripts/validate-dictionary.ts` | Validates the word lists for consistency |

These TypeScript scripts are run directly with `tsx`:

```
npx tsx scripts/generate-all-words.ts
```
