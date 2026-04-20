/**
 * Utilities for handling Pacific Time conversions.
 * Shared between client and server.
 */

/**
 * Get the current date in Pacific Time, formatted as MM-DD-YYYY
 */
export function getTodayInPacificTime(): string {
  const now = new Date();

  const pacificDateString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [month, day, year] = pacificDateString.split(",")[0].split("/");

  return `${month}-${day}-${year}`;
}

/**
 * Check if two dates in MM-DD-YYYY format are consecutive days
 * @param date1 The earlier date (MM-DD-YYYY)
 * @param date2 The later date (MM-DD-YYYY)
 * @returns true if date2 is exactly one day after date1
 */
export function areConsecutiveDays(date1: string, date2: string): boolean {
  const [month1, day1, year1] = date1.split("-").map(Number);
  const [month2, day2, year2] = date2.split("-").map(Number);

  const d1 = new Date(Date.UTC(year1, month1 - 1, day1));
  const d2 = new Date(Date.UTC(year2, month2 - 1, day2));

  const diffMs = d2.getTime() - d1.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return diffMs === oneDayMs;
}
