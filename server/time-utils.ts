/**
 * Utilities for handling Pacific Time conversions
 */

/**
 * Get the current date in Pacific Time, formatted as MM-DD-YYYY
 */
export function getTodayInPacificTime(): string {
  const now = new Date();

  // Convert to Pacific Time using toLocaleString
  const pacificDateString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Parse the date string (format: MM/DD/YYYY)
  const [month, day, year] = pacificDateString.split(",")[0].split("/");

  return `${month}-${day}-${year}`;
}

/**
 * Convert a Date object to Pacific Time and format as MM-DD-YYYY
 */
export function toPacificTimeDate(date: Date): string {
  const pacificDateString = date.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Parse the date string (format: MM/DD/YYYY)
  const [month, day, year] = pacificDateString.split(",")[0].split("/");

  return `${month}-${day}-${year}`;
}

/**
 * Get a Date object representing the current time in Pacific Time
 */
export function getNowInPacificTime(): Date {
  const now = new Date();

  // Get the current time in Pacific timezone
  const pacificString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });

  return new Date(pacificString);
}

/**
 * Check if two dates in MM-DD-YYYY format are consecutive days
 * @param date1 The earlier date (MM-DD-YYYY)
 * @param date2 The later date (MM-DD-YYYY)
 * @returns true if date2 is exactly one day after date1
 */
export function areConsecutiveDays(date1: string, date2: string): boolean {
  // Parse dates (format: MM-DD-YYYY)
  const [month1, day1, year1] = date1.split("-").map(Number);
  const [month2, day2, year2] = date2.split("-").map(Number);

  // Create Date objects (using UTC to avoid timezone issues)
  const d1 = new Date(Date.UTC(year1, month1 - 1, day1));
  const d2 = new Date(Date.UTC(year2, month2 - 1, day2));

  // Calculate difference in milliseconds
  const diffMs = d2.getTime() - d1.getTime();

  // One day in milliseconds
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Check if exactly one day apart
  return diffMs === oneDayMs;
}
