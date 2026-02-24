# Database

## Abstraction Layer

`server/db.ts` defines a `Database` interface. Two implementations exist:

| Class | File | Used When |
|---|---|---|
| `StubDatabase` | `server/db.ts` | `NODE_ENV !== 'production'` |
| `PostgresDatabase` | `server/postgres-db.ts` | `NODE_ENV === 'production'` |

`initializeDatabase()` in `server/start.ts` selects the correct implementation based on `NODE_ENV`. This allows local development without a running database instance.

`StubDatabase` stores everything in memory and resets on server restart. It is suitable for development and manual testing but has no persistence.

## Schema

Defined via Drizzle ORM in `server/schema.ts`. The production database is PostgreSQL.

### `users`
| Column | Type | Notes |
|---|---|---|
| `username` | varchar(50) | Primary key; stored lowercase for uniqueness |
| `originalUsername` | varchar(50) | Preserves the user's chosen casing |
| `passwordHash` | text | bcrypt hash |
| `createdAt` | timestamp | Set at insert |

### `results`
| Column | Type | Notes |
|---|---|---|
| `username` | varchar(50) | FK → users.username, cascade delete |
| `date` | varchar(10) | MM-DD-YYYY format |
| `guesses` | text | JSON-stringified array of guess strings |
| `numGuesses` | integer | |
| `won` | boolean | |
| `submittedAt` | timestamp | |

Primary key is `(username, date)` — one result per user per puzzle date.

### `userStats`
| Column | Type | Notes |
|---|---|---|
| `username` | varchar(50) | Primary key; FK → users.username |
| `currentStreak` | integer | Default 0 |
| `lastCompletedDate` | varchar(10) | MM-DD-YYYY |
| `updatedAt` | timestamp | |

Note: streak is also computable from `results` records directly. `userStats` serves as a cached value updated on each submission.

## Drizzle ORM

Queries use the Drizzle query builder with `eq()` and `and()` operators. There is no raw SQL in the application code.

## Migrations

Managed by Drizzle Kit. Configuration is in `drizzle.config.ts`. Generated migration files live in `drizzle/`. To apply schema changes:

```
npm run db:push
```

which runs `scripts/db-push.sh`. See [Scripts](../common/scripts.md) for details.
