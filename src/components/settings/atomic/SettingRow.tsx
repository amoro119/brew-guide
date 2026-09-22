import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { makeSettingRowSearchId } from '../settingsSearch';
import { useSettingSearchHighlight } from './SettingSearchHighlightContext';

interface SettingRowProps {
  label?: string; // 改为可选
  icon?: LucideIcon;
  description?: string;
  required?: boolean;
  children?: React.ReactNode;
  isLast?: boolean;
  className?: string;
  vertical?: boolean; // 是否垂直布局（用于复杂控件）
  isSubSetting?: boolean; // 是否为子设置项（显示半透明横杆前缀）
  settingId?: string;
  onClick?: () => void;
}

/**
 * 设置行组件 - 统一的设置项样式
 * 与 SettingItem 保持一致的设计语言
 * 分割线从文字开始位置到右边缘
 */
const SettingRow: React.FC<SettingRowProps> = ({
  label,
  icon: Icon,
  description,
  required = false,
  children,
  isLast = false,
  className = '',
  vertical = false,
  isSubSetting = false,
  settingId,
  onClick,
}) => {
  const { highlightedSettingId } = useSettingSearchHighlight();
  const resolvedSettingId =
    settingId || (label ? makeSettingRowSearchId(label) : null);
  const isHighlighted =
    !!resolvedSettingId && highlightedSettingId === resolvedSettingId;
  const requiredMarker = required ? (
    <span
      aria-hidden="true"
      className="ml-0.5 align-super text-[10px] leading-none text-red-500"
    >
      *
    </span>
  ) : null;
  const hasContent = React.Children.count(children) > 0;
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const labelColorClass = Icon
    ? 'text-neutral-500 dark:text-neutral-400'
    : 'text-neutral-800 dark:text-neutral-200';
  const labelContent = (
    <>
      {isSubSetting && (
        <span className="inline-block text-neutral-500 opacity-50 dark:text-neutral-400">
          —
        </span>
      )}
      {Icon && (
        <Icon
          className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
      <span className="truncate">
        {label}
        {requiredMarker}
      </span>
    </>
  );

  React.useEffect(() => {
    if (!isHighlighted) return;

    window.setTimeout(() => {
      rowRef.current?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }, 120);
  }, [isHighlighted]);

  if (vertical) {
    return (
      <div
        ref={rowRef}
        data-settings-search-id={resolvedSettingId || undefined}
        className={`flex w-full flex-col transition-colors duration-200 ${
          isHighlighted ? 'bg-neutral-200/70 dark:bg-neutral-700/45' : ''
        } ${className}`}
      >
        <div
          className={`flex flex-col p-3.5 ${
            !isLast ? 'border-b border-black/5 dark:border-white/5' : ''
          }`}
        >
          {label && (
            <div className="mb-3">
              <span
                className={`flex items-center gap-2 text-sm leading-none font-medium ${labelColorClass}`}
              >
                {labelContent}
              </span>
              {description && (
                <span className="mt-1.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                  {description}
                </span>
              )}
            </div>
          )}
          <div className="w-full leading-none">{children}</div>
        </div>
      </div>
    );
  }

  const RowContent = onClick ? 'button' : 'div';

  return (
    <div
      ref={rowRef}
      data-settings-search-id={resolvedSettingId || undefined}
      className={`flex w-full items-stretch px-3.5 transition-colors duration-200 ${
        isHighlighted ? 'bg-neutral-200/70 dark:bg-neutral-700/45' : ''
      } ${className}`}
    >
      <RowContent
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`flex min-w-0 flex-1 items-center justify-between py-3.5 text-left ${
          onClick ? 'cursor-pointer transition-opacity active:opacity-70' : ''
        } ${!isLast ? 'border-b border-black/5 dark:border-white/5' : ''}`}
      >
        {label && (
          <div className="mr-4 flex shrink-0 flex-col">
            <span
              className={`flex items-center gap-2 text-sm leading-none font-medium ${labelColorClass}`}
            >
              {labelContent}
            </span>
            {description && (
              <span className="mt-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {description}
              </span>
            )}
          </div>
        )}
        {hasContent && (
          <div className="flex min-w-0 flex-1 items-center justify-end">
            {children}
          </div>
        )}
      </RowContent>
    </div>
  );
};

export default SettingRow;
