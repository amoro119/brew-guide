'use client';

import type React from 'react';
import TabUnderline from './TabUnderline';

interface TabButtonProps {
  isActive: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onDoubleClick?: () => void;
  children: React.ReactNode;
  className?: string;
  dataTab?: string;
  title?: string;
  layoutId?: string; // 用于区分不同的 tab 组，相同 layoutId 的下划线会产生滑动动画
}

const TabButton = ({
  isActive,
  onClick,
  onDoubleClick,
  children,
  className = '',
  dataTab,
  title,
  layoutId = 'tab-underline',
}: TabButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative pb-1.5 text-xs font-medium whitespace-nowrap ${
        isActive
          ? 'text-neutral-800 dark:text-neutral-100'
          : 'text-neutral-600 hover:opacity-80 dark:text-neutral-400'
      } ${className}`}
      data-tab={dataTab}
      title={title}
    >
      <span className="relative">{children}</span>
      {isActive && <TabUnderline layoutId={layoutId} />}
    </button>
  );
};

export default TabButton;
