// Paste into the browser DevTools console while on the game page.
// For the given date, if that day's saved game has exactly 15 guesses,
// rewrite it to guessesRemaining: 0 and wonGame: true. Otherwise no-op.
//
// Usage:
//   fixHistoryDay("2026-04-28");

(function () {
  const STORAGE_KEY = "wordgame-history";
  const TARGET_GUESS_COUNT = 15;

  function fixHistoryDay(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`date must be YYYY-MM-DD, got: ${date}`);
    }

    const [yyyy, mm, dd] = date.split("-");
    const storageKey = `${mm}-${dd}-${yyyy}`;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      console.log("No history in localStorage. Nothing to do.");
      return null;
    }

    const history = JSON.parse(raw);
    const existing = history.games[storageKey];

    if (existing == null) {
      console.log(`No game for ${storageKey}. Nothing to do.`);
      return null;
    }

    const guessCount = Array.isArray(existing.guesses) ? existing.guesses.length : 0;
    if (guessCount !== TARGET_GUESS_COUNT) {
      console.log(`${storageKey} has ${guessCount} guesses (need exactly ${TARGET_GUESS_COUNT}). Nothing to do.`);
      return null;
    }

    const next = { ...existing, guessesRemaining: 0, wonGame: true };
    history.games[storageKey] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    console.log(`Updated ${storageKey}:`, next);
    console.log("Reload the page to see the change in the UI.");
    return next;
  }

  window.fixHistoryDay = fixHistoryDay;
  console.log("fixHistoryDay(date) is now available on window.");
})();
