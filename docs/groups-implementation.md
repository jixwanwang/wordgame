# Groups CRUD Implementation

## Schema (`server/schema.ts`)
Added `creatorUsername` column to the `groups` table, referencing `users.username` with cascade delete.

## Database layer (`server/db.ts`, `server/postgres-db.ts`)
Added `GroupInfo` interface and 8 methods to the `Database` interface, with implementations in both `StubDatabase` (in-memory maps) and `PostgresDatabase` (Drizzle ORM):

- `createGroup`, `getGroup`, `getGroupsForUser`, `deleteGroup`
- `addUserToGroup`, `removeUserFromGroup`, `getGroupMembers`, `isUserInGroup`

## API endpoints (`server/index.ts`)
Six endpoints behind `authenticateToken`:

| Endpoint | Access Control |
|---|---|
| `POST /api/groups` | Any auth'd user; creator auto-added as member |
| `GET /api/groups` | Returns groups the caller belongs to |
| `GET /api/groups/:id` | Members only; returns group + member list |
| `DELETE /api/groups/:id` | Creator only |
| `POST /api/groups/:id/members` | Members can add others; 404 if user doesn't exist, 409 if already member |
| `DELETE /api/groups/:id/members/:username` | Self-removal or creator can remove anyone |

## Tests (`server/index.test.ts`)
22 new tests covering all group endpoints and access control rules (create, list, view, delete, add member, remove member — including positive cases, 401/403/404/409 error cases).

## Bug fixes along the way
- Added `user?: User` to Express `Request` type augmentation (`server/auth.ts`)
- Fixed `instanceof jwt.TokenExpiredError` failing across CJS/ESM boundary (`server/auth.ts`)
- Removed unused imports/variables across client and server files
- Created `client/src/vite-env.d.ts` for `.png` module declarations
- Updated `MockDatabase` in tests to match current `Database` interface
- Fixed all 16 pre-existing test failures (wrong date format, wrong error field checks, secret mismatch)
- Installed `supertest` + `@types/supertest`
- Added `scripts/test.sh`
