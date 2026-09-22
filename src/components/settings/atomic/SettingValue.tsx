import React from 'react';
import { cn } from '@/lib/utils/classNameUtils';

interface SettingValueProps {
  children: React.ReactNode;
  /** 右侧单位或图标，统一控制与值的间距 */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * 设置行右侧值区域 - 统一宽度、对齐方式及尾部附件间距
 */
const SettingValue: React.FC<SettingValueProps> = ({
  children,
  trailing,
  className,
}) => (
  <div
    className={cn(
      'flex h-3.5 w-48 max-w-[52vw] min-w-0 items-center justify-end gap-x-1.5',
      className
    )}
  >
    <div className="flex min-w-0 flex-1 items-center justify-end gap-x-1.5">
      {children}
    </div>
    {trailing != null && (
      <span className="flex h-full w-3.5 shrink-0 items-center justify-start text-sm leading-none font-medium text-neutral-500 dark:text-neutral-400 [&>svg]:size-3.5">
        {trailing}
      </span>
    )}
  </div>
);

export default SettingValue;
