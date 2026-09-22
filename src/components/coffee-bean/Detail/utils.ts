'use client';

import type { KeyboardEvent } from 'react';
import { CoffeeBean } from '@/types/app';
import { parseDateToTimestamp } from '@/lib/utils/dateUtils';
import { calculateFlavorInfo } from '@/lib/utils/flavorPeriodUtils';

export const blurBeanDetailEditorOnEscape = (
  event: KeyboardEvent<HTMLDivElement>
): void => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;

  const editable = (event.target as HTMLElement).closest<HTMLElement>(
    'input, textarea, select, [contenteditable="true"], [role="textbox"]'
  );
  if (!editable) return;

  event.preventDefault();
  event.stopPropagation();
  editable.blur();
};

// 工具函数：格式化数字显示
export const formatNumber = (value: string | undefined): string =>
  !value
    ? '0'
    : Number.isInteger(parseFloat(value))
      ? Math.floor(parseFloat(value)).toString()
      : value;

// 工具函数：格式化日期显示
export const formatDateString = (dateStr: string): string => {
  try {
    const timestamp = parseDateToTimestamp(dateStr);
    const date = new Date(timestamp);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    const daysSinceRoast = getDaysSinceDateString(dateStr);

    // 如果是今天或未来日期，不显示天数
    if (daysSinceRoast === null || daysSinceRoast <= 0) {
      return formattedDate;
    }

    return `${formattedDate} (已养豆 ${daysSinceRoast} 天)`;
  } catch {
    return dateStr;
  }
};

export const getDaysSinceDateString = (dateStr: string): number | null => {
  try {
    const timestamp = parseDateToTimestamp(dateStr);
    const date = new Date(timestamp);
    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const targetDateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return Math.ceil(
      (todayDate.getTime() - targetDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    );
  } catch {
    return null;
  }
};

// 工具函数：计算赏味期信息
export const getFlavorInfo = (bean: CoffeeBean | null) => {
  if (!bean) return { phase: '未知', status: '未知状态' };

  const flavorInfo = calculateFlavorInfo(bean);
  return {
    phase: flavorInfo.phase,
    status: flavorInfo.status || '未知状态',
  };
};

// 解析日期字符串为Date对象
export const parseDateString = (
  dateStr: string | undefined
): Date | undefined => {
  if (!dateStr) return undefined;
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return undefined;
};

// 计算输入框宽度的函数
export const calcInputWidth = (text: string, fallback: string): string => {
  const displayText = text || fallback;
  // 中文按字宽计算，英文按 ch 计算，额外留 2px 光标空间
  let fullWidthLength = 0;
  let halfWidthLength = 0;

  for (const char of displayText) {
    if (char.charCodeAt(0) > 127) {
      fullWidthLength += 1;
    } else {
      halfWidthLength += 1;
    }
  }

  return `calc(${fullWidthLength}em + ${halfWidthLength}ch + 2px)`;
};
