'use client';

import React from 'react';
import TagAutocompleteInput from './TagAutocompleteInput';

export type TagListVariant = 'immersive' | 'settings';

export interface TagListItem {
  id: number | string;
  value: string;
}

interface TagListFieldProps {
  items: TagListItem[];
  label: string;
  placeholder?: string;
  suggestions: string[];
  onAdd: (value: string) => void;
  onUpdate: (id: TagListItem['id'], value: string) => void;
  onRemove: (id: TagListItem['id']) => void;
  isCustomPreset?: (value: string) => boolean;
  onRemovePreset?: (value: string) => void;
  variant?: TagListVariant;
  showInput?: boolean;
}

const Separator: React.FC = () => (
  <span
    aria-hidden="true"
    className="text-sm leading-none text-neutral-400 select-none dark:text-neutral-600"
  >
    ·
  </span>
);

const TagListField: React.FC<TagListFieldProps> = ({
  items,
  label,
  placeholder: placeholderOverride,
  suggestions,
  onAdd,
  onUpdate,
  onRemove,
  isCustomPreset,
  onRemovePreset,
  variant = 'immersive',
  showInput = true,
}) => {
  const isSettings = variant === 'settings';
  const placeholder =
    placeholderOverride ??
    (items.length === 0
      ? `输入${label}，逗号分隔`
      : isSettings
        ? `继续添加${label}`
        : '+ ');

  return (
    <div
      className={
        isSettings
          ? 'flex w-48 max-w-[52vw] flex-wrap items-center justify-end gap-x-1.5 gap-y-2'
          : '-mt-0.5 flex min-w-0 flex-1 flex-wrap items-center gap-1'
      }
    >
      {items.map((item, index) => (
        <span
          key={item.id}
          className={
            isSettings ? 'inline-flex items-center gap-x-1.5' : 'contents'
          }
        >
          {isSettings && index > 0 && <Separator />}
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={event => {
              const nextValue = event.currentTarget.textContent?.trim() || '';
              if (nextValue === item.value) return;

              if (nextValue) {
                onUpdate(item.id, nextValue);
              } else {
                onRemove(item.id);
              }
            }}
            className={
              isSettings
                ? 'cursor-text text-sm leading-none font-medium text-neutral-800 outline-none dark:text-neutral-200'
                : 'cursor-text bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700 outline-none dark:bg-neutral-800/40 dark:text-neutral-300'
            }
          >
            {item.value}
          </span>
        </span>
      ))}

      {showInput && (
        <span
          className={
            isSettings
              ? 'inline-flex max-w-full min-w-0 items-center gap-x-1.5'
              : 'contents'
          }
        >
          {isSettings && items.length > 0 && <Separator />}
          <TagAutocompleteInput
            placeholder={placeholder}
            suggestions={suggestions.filter(
              suggestion => !items.some(item => item.value === suggestion)
            )}
            isCustomPreset={isCustomPreset}
            onRemovePreset={onRemovePreset}
            onCommit={onAdd}
            onBackspaceEmpty={() => {
              const lastItem = items.at(-1);
              if (!lastItem) return undefined;

              onRemove(lastItem.id);
              return lastItem.value;
            }}
            className={
              isSettings
                ? 'block bg-transparent p-0 text-left text-sm leading-none font-medium text-neutral-800 placeholder:text-neutral-400 dark:bg-transparent dark:text-neutral-200 dark:placeholder:text-neutral-500'
                : undefined
            }
          />
        </span>
      )}
    </div>
  );
};

export default TagListField;
