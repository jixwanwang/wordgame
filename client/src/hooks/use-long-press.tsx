import * as React from "react";

interface UseLongPressOptions {
  onShortPress: () => void;
  onLongPress: () => void;
  delay?: number;
}

export function useLongPress({ onShortPress, onLongPress, delay = 800 }: UseLongPressOptions) {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = React.useCallback(() => {
    timerRef.current = setTimeout(() => {
      onLongPress();
      timerRef.current = null;
    }, delay);
  }, [onLongPress, delay]);

  const handlePressEnd = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      // If timer was still running, it's a short press
      onShortPress();
    }
  }, [onShortPress]);

  const handlePressCancel = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressCancel,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onTouchCancel: handlePressCancel,
  };
}
