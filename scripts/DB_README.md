# Database Management Script

This script manages database schema changes with Drizzle ORM.

## Prerequisites

Make sure you have a `.env` file in the project root with `DATABASE_URL` set:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

## Usage

### Push Schema Changes

```bash
npm run db:push
```

This command:
- Reads your schema from `server/schema.ts`
- Directly pushes changes to the database
- Includes a confirmation prompt before applying changes
- Shows the database host (without exposing credentials)

## Example: Pushing the user_stats Table

After updating `server/schema.ts` with the new `user_stats` table:

```bash
npm run db:push
```

The script will prompt you to confirm before applying changes.

## Safety Features

The script includes:
- ✅ Confirmation prompt before applying changes
- ✅ Database host display (without showing credentials)
- ✅ Error checking for missing .env or DATABASE_URL
- ✅ Clear success/error messages

## Troubleshooting

**Error: DATABASE_URL not found**
- Make sure `.env` file exists in project root
- Verify `DATABASE_URL` is set in `.env`

**Connection errors**
- Verify database is running and accessible
- Check DATABASE_URL format and credentials
- Ensure network access to database host
