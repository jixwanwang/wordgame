# WordGame — Codebase Documentation

This document is intended for LLM reading. It describes what the repository does and how it is organized. Detailed documentation for each subsystem lives in subdocuments linked below.

---

## What This Repo Is

WordGame is a daily crossword-style word puzzle game hosted at **crosses.io**. Players are given an 8×8 grid containing hidden words and must guess the words within 15 attempts. A new puzzle is published every day in Pacific Time. Two difficulty modes exist: normal and hard.

Users can play without an account. Creating an account enables persistent history across devices and streak tracking.

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State management | Redux Toolkit (no persistence) |
| Routing | Wouter |
| Backend | Express 4, TypeScript, tsx / esbuild |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (15-day expiry) + bcrypt |
| Deployment | GCP VM, Nginx reverse proxy, PM2, SSL |

---

## Repository Layout

```
wordgame/
├── client/src/         # React frontend
├── server/             # Express backend
├── lib/                # Code shared between client and server
├── scripts/            # Shell and TypeScript build/deploy scripts
├── drizzle/            # Auto-generated database migrations
├── dist/               # Build output (gitignored)
├── docs/               # This documentation
├── package.json        # Single package.json for the whole monorepo
├── vite.config.ts      # Vite config (client build + dev proxy)
├── drizzle.config.ts   # Drizzle ORM config
└── ecosystem.config.js # PM2 process manager config
```

The project is structured as a single-package monorepo. Client and server share types and utilities via the top-level `lib/` directory.

---

## Subsystem Documentation

### Client
- [Client Overview](client/overview.md) — React app, components, routing
- [State Management](client/state.md) — Redux slices, thunks, selectors
- [Client Storage](client/storage.md) — localStorage, cookies, API client

### Server
- [Server Overview](server/overview.md) — Express app, endpoints, middleware
- [Database](server/database.md) — Schema, Drizzle ORM, migrations, abstraction layer
- [Authentication](server/auth.md) — JWT strategy, bcrypt, token refresh, username rules

### Common
- [Shared Library](common/shared-lib.md) — `/lib/` types, game logic, grid, puzzles, dictionary
- [Environments](common/environments.md) — Dev vs production, environment variables, deployment
- [Scripts](common/scripts.md) — Build, deploy, and utility scripts
