'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils/classNameUtils';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
  minRows?: number;
  onMultilineChange?: (isMultiline: boolean) => void;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  className = '',
  placeholder,
  readOnly,
  style,
  minRows = 1,
  onMultilineChange,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = 'hidden';

    const computedStyle = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
    const fontSize = Number.parseFloat(computedStyle.fontSize);
    const lineHeight = Number.isFinite(parsedLineHeight)
      ? parsedLineHeight
      : fontSize * 1.5;
    onMultilineChange?.(textarea.scrollHeight > lineHeight + 1);
  }, [onMultilineChange, value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={cn(
        'w-full resize-none overflow-hidden rounded-none bg-transparent outline-hidden transition-colors',
        className
      )}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={minRows}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      style={{
        ...style,
      }}
      {...props}
    />
  );
};

export default AutoResizeTextarea;
