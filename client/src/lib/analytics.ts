import posthog from "posthog-js";

let initialized = false;

export function initAnalytics(): void {
  const apiKey = import.meta.env?.VITE_POSTHOG_API_KEY;
  if (apiKey == null || apiKey === "") {
    return;
  }
  posthog.init(apiKey, {
    api_host: "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    disable_surveys: true,
  });
  initialized = true;
}

export function identifyUser(username: string): void {
  if (!initialized) {
    return;
  }
  posthog.identify(username);
}

export function resetAnalyticsUser(): void {
  if (!initialized) {
    return;
  }
  posthog.reset();
}

interface PuzzleBaseProps {
  difficulty: "normal" | "hard";
  puzzle_date: string;
  is_past_puzzle: boolean;
  is_authenticated: boolean;
}

interface PuzzleViewedProps extends PuzzleBaseProps {
  hints_shown: boolean;
}

interface PuzzleGuessProps extends PuzzleBaseProps {
  guess_type: "letter" | "word";
  guess_value: string;
  guess_number: number;
  is_correct: boolean;
}

interface PuzzleCompletedProps extends PuzzleBaseProps {
  won: boolean;
  guesses_used: number;
  letters_revealed: number;
}

export function trackPuzzleViewed(props: PuzzleViewedProps): void {
  if (!initialized) {
    return;
  }
  posthog.capture("puzzle_viewed", props);
}

export function trackPuzzleStarted(props: PuzzleBaseProps): void {
  if (!initialized) {
    return;
  }
  posthog.capture("puzzle_started", props);
}

export function trackPuzzleGuess(props: PuzzleGuessProps): void {
  if (!initialized) {
    return;
  }
  posthog.capture("puzzle_guess", props);
}

export function trackPuzzleCompleted(props: PuzzleCompletedProps): void {
  if (!initialized) {
    return;
  }
  posthog.capture("puzzle_completed", props);
}
