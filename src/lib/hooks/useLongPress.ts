'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseLongPressOptions {
  onClick: () => void;
  onLongPress: () => void;
  delay?: number;
}

export function useLongPress({
  onClick,
  onLongPress,
  delay = 500,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      clearTimer();
      longPressRef.current = false;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        longPressRef.current = true;
        onLongPress();
      }, delay);
    },
    [clearTimer, delay, onLongPress]
  );

  const handlePointerEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (longPressRef.current) {
        event.preventDefault();
        longPressRef.current = false;
        return;
      }

      onClick();
    },
    [onClick]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onPointerLeave: handlePointerEnd,
    onClick: handleClick,
  };
}
