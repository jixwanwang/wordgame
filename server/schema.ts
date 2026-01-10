import { pgTable, varchar, text, timestamp, boolean, integer, primaryKey } from "drizzle-orm/pg-core";

/**
 * Users table
 * Stores user authentication data with case-insensitive username uniqueness
 */
export const users = pgTable("users", {
  // Lowercase username for case-insensitive lookups
  username: varchar("username", { length: 50 }).primaryKey(),
  // Original username with preserved casing for display
  originalUsername: varchar("original_username", { length: 50 }).notNull(),
  // bcrypt hashed password
  passwordHash: text("password_hash").notNull(),
  // Timestamp when user was created
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Puzzle results table
 * Stores user submissions for daily puzzles
 */
export const results = pgTable(
  "results",
  {
    // Username (lowercase, references users table)
    username: varchar("username", { length: 50 })
      .notNull()
      .references(() => users.username, { onDelete: "cascade" }),
    // Puzzle date in MM-DD-YYYY format
    date: varchar("date", { length: 10 }).notNull(),
    // Array of guesses as JSON text
    guesses: text("guesses").notNull(),
    // Number of guesses made
    numGuesses: integer("num_guesses").notNull(),
    // Whether the user won
    won: boolean("won").notNull(),
    // Timestamp when result was submitted
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  },
  (table) => ({
    // Composite primary key: one result per user per date
    pk: primaryKey({ columns: [table.username, table.date] }),
  }),
);

/**
 * User stats table
 * Stores current streak and last completed date for each user
 */
export const userStats = pgTable("user_stats", {
  // Username (lowercase, references users table)
  username: varchar("username", { length: 50 })
    .primaryKey()
    .references(() => users.username, { onDelete: "cascade" }),
  // Current win streak
  currentStreak: integer("current_streak").notNull().default(0),
  // Last completed puzzle date in MM-DD-YYYY format
  lastCompletedDate: varchar("last_completed_date", { length: 10 }),
  // Timestamp when stats were last updated
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;
