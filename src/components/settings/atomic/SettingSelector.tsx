'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/classNameUtils';

export interface SettingSelectorOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SettingSelectorProps<T extends string | number = string> {
  value: T;
  options: SettingSelectorOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const SELECTOR_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.7,
  bounce: 0,
} as const;

interface HighlightFrame {
  x: number;
  width: number;
}

function SettingSelector<T extends string | number = string>({
  value,
  options,
  onChange,
  className,
  fullWidth = false,
  disabled = false,
  ariaLabel,
}: SettingSelectorProps<T>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const prefersReducedMotion = useReducedMotion();
  const [highlightFrame, setHighlightFrame] =
    React.useState<HighlightFrame | null>(null);
  const selectedIndex = options.findIndex(option => option.value === value);
  const firstEnabledIndex = options.findIndex(option => !option.disabled);
  const lastEnabledIndex = React.useMemo(() => {
    const reverseIndex = [...options]
      .reverse()
      .findIndex(option => !option.disabled);
    return reverseIndex === -1 ? -1 : options.length - 1 - reverseIndex;
  }, [options]);

  const updateHighlightFrame = React.useCallback(() => {
    const container = containerRef.current;
    const activeButton =
      selectedIndex >= 0 ? buttonRefs.current[selectedIndex] : null;

    if (!container || !activeButton) {
      setHighlightFrame(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const nextFrame = {
      x: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    };

    setHighlightFrame(current => {
      if (
        current &&
        Math.abs(current.x - nextFrame.x) < 0.5 &&
        Math.abs(current.width - nextFrame.width) < 0.5
      ) {
        return current;
      }

      return nextFrame;
    });
  }, [selectedIndex]);

  React.useLayoutEffect(() => {
    buttonRefs.current.length = options.length;
  }, [options.length]);

  React.useLayoutEffect(() => {
    updateHighlightFrame();
  }, [updateHighlightFrame]);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const frame = { current: 0 };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(updateHighlightFrame);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    const container = containerRef.current;

    if (container) {
      observer.observe(container);
    }

    buttonRefs.current.forEach(button => {
      if (button) {
        observer.observe(button);
      }
    });

    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, [options, updateHighlightFrame]);

  const focusButton = React.useCallback((index: number) => {
    buttonRefs.current[index]?.focus();
  }, []);

  const findEnabledIndex = React.useCallback(
    (startIndex: number, direction: 1 | -1) => {
      if (disabled || options.length === 0) {
        return -1;
      }

      let index = startIndex;

      for (let step = 0; step < options.length; step += 1) {
        index = (index + direction + options.length) % options.length;

        if (!options[index]?.disabled) {
          return index;
        }
      }

      return -1;
    },
    [disabled, options]
  );

  const handleSelection = React.useCallback(
    (option: SettingSelectorOption<T>) => {
      if (disabled || option.disabled) {
        return;
      }

      if (option.value !== value) {
        onChange(option.value);
      }
    },
    [disabled, onChange, value]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (disabled) {
        return;
      }

      let targetIndex = -1;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          targetIndex = findEnabledIndex(index, 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          targetIndex = findEnabledIndex(index, -1);
          break;
        case 'Home':
          targetIndex = firstEnabledIndex;
          break;
        case 'End':
          targetIndex = lastEnabledIndex;
          break;
        default:
          return;
      }

      if (targetIndex < 0 || targetIndex >= options.length) {
        return;
      }

      event.preventDefault();
      focusButton(targetIndex);
      handleSelection(options[targetIndex]);
    },
    [
      disabled,
      findEnabledIndex,
      firstEnabledIndex,
      focusButton,
      handleSelection,
      lastEnabledIndex,
      options,
    ]
  );

  return (
    <div
      className={cn(
        'relative inline-flex h-0 items-center overflow-visible',
        fullWidth && 'w-full',
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative isolate inline-flex items-center rounded-full bg-neutral-200/60 select-none dark:bg-neutral-700/60',
          'h-6 p-0.5',
          fullWidth && 'flex w-full',
          disabled && 'opacity-60'
        )}
        role={ariaLabel ? 'radiogroup' : 'group'}
        aria-label={ariaLabel}
      >
        {highlightFrame && (
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{
              x: highlightFrame.x,
              width: highlightFrame.width,
            }}
            transition={
              prefersReducedMotion ? { duration: 0 } : SELECTOR_SPRING
            }
            className="pointer-events-none absolute inset-y-0.5 left-0 rounded-full bg-white will-change-transform dark:bg-white"
          />
        )}

        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isDisabled = disabled || option.disabled;
          const isTabStop =
            !isDisabled &&
            (isSelected ||
              (selectedIndex === -1 && index === firstEnabledIndex) ||
              (selectedIndex >= 0 &&
                Boolean(options[selectedIndex]?.disabled) &&
                index === firstEnabledIndex));

          return (
            <button
              key={String(option.value)}
              ref={element => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              disabled={isDisabled}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isTabStop ? 0 : -1}
              onClick={() => handleSelection(option)}
              onKeyDown={event => handleKeyDown(event, index)}
              className={cn(
                'relative z-10 inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-neutral-400/60 focus-visible:ring-offset-0 focus-visible:outline-none disabled:cursor-not-allowed dark:focus-visible:ring-neutral-500/70',
                'h-5 px-3 text-xs',
                fullWidth && 'flex-1',
                isSelected
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700 disabled:text-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-200 dark:disabled:text-neutral-500'
              )}
            >
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SettingSelector;
