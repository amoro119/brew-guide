import React from 'react';
import { cn } from '@/lib/utils/classNameUtils';

type SettingValueInputProps = React.ComponentProps<'input'>;

const getVisualTextWidth = (text: string) =>
  Array.from(text).reduce((width, character) => {
    const isWideCharacter = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(
      character
    );
    return width + (isWideCharacter ? 2 : 1);
  }, 0);

/**
 * 设置行右侧的标准输入框，仅供 SettingValue 内的行内数值输入使用
 */
const SettingValueInput: React.FC<SettingValueInputProps> = ({
  className,
  value,
  placeholder,
  style,
  ...props
}) => {
  const displayText =
    value != null && value !== '' ? String(value) : placeholder;
  const width = Math.max(getVisualTextWidth(displayText || ''), 1);

  return (
    <input
      {...props}
      value={value}
      placeholder={placeholder}
      style={{ width: `${width}ch`, ...style }}
      className={cn(
        'h-full min-w-0 shrink-0 bg-transparent text-right text-sm leading-none font-medium text-neutral-800 outline-none placeholder:text-neutral-400 disabled:opacity-60 dark:text-neutral-200 dark:placeholder:text-neutral-500',
        className
      )}
    />
  );
};

export default SettingValueInput;
