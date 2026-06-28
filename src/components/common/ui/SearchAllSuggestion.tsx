'use client';

import React from 'react';

interface SearchAllSuggestionProps {
  scopeLabel?: string;
  query: string;
  onClick?: () => void;
}

const SearchAllSuggestion: React.FC<SearchAllSuggestionProps> = ({
  scopeLabel,
  query,
  onClick,
}) => {
  const trimmedQuery = query.trim();

  if (!scopeLabel || !trimmedQuery || !onClick) {
    return null;
  }

  return (
    <div className="border-t border-neutral-200/50 dark:border-neutral-800/50">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-wrap items-center gap-y-1 px-6 py-2.5 text-left text-xs leading-none font-medium text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <span className="leading-none wrap-break-word">
          {scopeLabel}内未找到 {trimmedQuery}
        </span>
        <span className="mx-2 h-3 w-px shrink-0 self-center bg-neutral-200 dark:bg-neutral-800" />
        <span className="leading-none text-neutral-800 dark:text-neutral-100">
          搜索全部
        </span>
      </button>
    </div>
  );
};

export default SearchAllSuggestion;
