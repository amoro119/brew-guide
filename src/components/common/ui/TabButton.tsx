'use client';

import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'framer-motion';
import { centerCategoryTab } from '@/lib/utils/centerCategoryTab';

const UNDERLINE_TRANSITION = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
  mass: 1,
};

interface TabButtonProps {
  isActive: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onDoubleClick?: () => void;
  children: ReactNode;
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
  const handleClick: MouseEventHandler<HTMLButtonElement> = event => {
    onClick(event);
    // 新选择由布局更新后的 effect 居中；这里只处理再次点击已选项。
    if (isActive && event.detail < 2) {
      centerCategoryTab(
        event.currentTarget.closest<HTMLElement>('[data-category-scroll]'),
        event.currentTarget
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      className={`relative pb-1.5 text-xs font-medium whitespace-nowrap ${
        isActive
          ? 'text-neutral-800 dark:text-neutral-100'
          : 'text-neutral-600 hover:opacity-80 dark:text-neutral-400'
      } ${className}`}
      data-tab={dataTab}
      data-tab-active={isActive}
      title={title}
    >
      <span className="relative">{children}</span>
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-x-0 bottom-0 h-px bg-neutral-800 dark:bg-white"
          transition={UNDERLINE_TRANSITION}
        />
      )}
    </button>
  );
};

export default TabButton;
