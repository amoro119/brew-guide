'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SuggestionDropdown, {
  SUGGESTION_DROPDOWN_Z_INDEX,
} from '@/components/common/forms/SuggestionDropdown';
import {
  autocompleteDropdownMiddleware,
  autoUpdateAutocompleteDropdown,
} from '@/components/common/forms/autocompleteFloating';
import {
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { cn } from '@/lib/utils/classNameUtils';

interface TagAutocompleteInputProps {
  placeholder: string;
  suggestions: string[];
  onCommit: (value: string) => void;
  onBackspaceEmpty?: () => string | undefined;
  isCustomPreset?: (value: string) => boolean;
  onRemovePreset?: (value: string) => void;
  className?: string;
}

const COMMIT_KEYS = new Set(['Enter', ',', '，', '、', ';', '；']);
const VALUE_SEPARATOR_REGEX = /[,，、;；]+/;

const normalizeCommitValue = (value: string) =>
  value
    .split(VALUE_SEPARATOR_REGEX)
    .map(item => item.trim())
    .filter(Boolean)
    .join(',');

const getActiveSuggestionQuery = (value: string) => {
  const segments = value.split(VALUE_SEPARATOR_REGEX);
  return (segments[segments.length - 1] || '').trim();
};

const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({
  placeholder,
  suggestions,
  onCommit,
  onBackspaceEmpty,
  isCustomPreset = () => false,
  onRemovePreset,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [removedSuggestions, setRemovedSuggestions] = useState<Set<string>>(
    () => new Set()
  );
  const closeTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: autocompleteDropdownMiddleware,
    whileElementsMounted: autoUpdateAutocompleteDropdown,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const setInputElement = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      refs.setReference(node);
    },
    [refs]
  );

  const setFloatingElement = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
    },
    [refs]
  );

  const filteredSuggestions = useMemo(() => {
    const query = getActiveSuggestionQuery(inputValue).toLowerCase();
    const visibleSuggestions = suggestions.filter(
      suggestion => !removedSuggestions.has(suggestion)
    );

    if (!query) {
      return visibleSuggestions;
    }

    return visibleSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query)
    );
  }, [inputValue, removedSuggestions, suggestions]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const commitValue = (value: string) => {
    const nextValue = normalizeCommitValue(value);
    setInputValue('');
    setIsOpen(false);
    if (!nextValue) return;

    onCommit(nextValue);
  };

  const handleFocus = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    if (filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    closeTimerRef.current = window.setTimeout(() => {
      commitValue(inputValue);
      setIsOpen(false);
    }, 120);
  };

  return (
    <span className="relative inline-grid max-w-full grid-cols-[minmax(0,max-content)]">
      <span
        aria-hidden="true"
        className={cn(
          'invisible col-start-1 row-start-1 w-max max-w-full px-1.5 py-0.5 text-xs font-medium whitespace-pre select-none',
          className
        )}
      >
        {inputValue || placeholder}
      </span>
      <input
        ref={setInputElement}
        type="text"
        size={1}
        value={inputValue}
        placeholder={placeholder}
        onChange={event => {
          const nextValue = event.currentTarget.value;
          const isComposing = (event.nativeEvent as InputEvent).isComposing;
          if (!isComposing && VALUE_SEPARATOR_REGEX.test(nextValue)) {
            commitValue(nextValue);
            return;
          }

          setInputValue(nextValue);
          setIsOpen(filteredSuggestions.length > 0 || nextValue.trim() !== '');
        }}
        onCompositionEnd={event => {
          if (VALUE_SEPARATOR_REGEX.test(event.currentTarget.value)) {
            commitValue(event.currentTarget.value);
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;

          if (COMMIT_KEYS.has(event.key)) {
            event.preventDefault();
            if (inputValue.trim()) {
              commitValue(inputValue);
            }
            return;
          }

          if (
            event.key === 'Backspace' &&
            !inputValue.trim() &&
            onBackspaceEmpty
          ) {
            event.preventDefault();
            const restoredValue = onBackspaceEmpty();
            if (restoredValue) {
              setInputValue(restoredValue);
              setIsOpen(true);
            }
          }

          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className={cn(
          'col-start-1 row-start-1 w-full max-w-full min-w-[1ch] bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700 placeholder:text-neutral-400 focus:outline-none dark:bg-neutral-800/40 dark:text-neutral-300 dark:placeholder:text-neutral-500',
          className
        )}
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <FloatingPortal>
          <SuggestionDropdown
            ref={setFloatingElement}
            suggestions={filteredSuggestions}
            onSelect={suggestion => {
              commitValue(suggestion);
              inputRef.current?.focus();
            }}
            isRemovableSuggestion={isCustomPreset}
            onRemoveSuggestion={
              onRemovePreset
                ? suggestion => {
                    setRemovedSuggestions(current => {
                      const next = new Set(current);
                      next.add(suggestion);
                      return next;
                    });
                    onRemovePreset(suggestion);
                    if (inputValue === suggestion) {
                      setInputValue('');
                    }
                  }
                : undefined
            }
            style={{
              ...floatingStyles,
              zIndex: SUGGESTION_DROPDOWN_Z_INDEX,
              minWidth: 128,
            }}
            {...getFloatingProps()}
          />
        </FloatingPortal>
      )}
    </span>
  );
};

export default TagAutocompleteInput;
