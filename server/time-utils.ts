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
