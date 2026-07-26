'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGrinderStore } from '@/lib/stores/grinderStore';
import { useInputFocus } from '@/lib/hooks/useInputFocus';
import hapticsUtils from '@/lib/ui/haptics';
import GrindSizeDrawer from './GrindSizeDrawer';

interface GrinderScaleIndicatorProps {
  /** 是否显示 */
  visible?: boolean;
  /** 是否启用触感反馈 */
  hapticFeedback?: boolean;
}

// 常量提取到组件外部
const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

const BUTTON_BASE_CLASS =
  'rounded-full border border-neutral-200/50 dark:border-neutral-700/50 bg-neutral-100 dark:bg-neutral-800';
const SELECTED_GRINDER_STORAGE_KEY =
  'brew-guide:grinder-scale-indicator:selectedGrinderId';
/** 抽屉滑入完成后再聚焦，避免键盘和进场动画同时进行导致抖动 */
const FOCUS_DELAY_MS = 400;

// 字体大小映射
const FONT_SIZE_MAP = [
  'text-base',
  'text-base',
  'text-sm',
  'text-xs',
  'text-[10px]',
  'text-[8px]',
];
const getFontSize = (len: number) =>
  FONT_SIZE_MAP[Math.min(len, 5)] || 'text-[8px]';

const saveSelectedGrinderId = (grinderId: string | null) => {
  if (typeof window === 'undefined') return;

  if (grinderId) {
    localStorage.setItem(SELECTED_GRINDER_STORAGE_KEY, grinderId);
    return;
  }

  localStorage.removeItem(SELECTED_GRINDER_STORAGE_KEY);
};

/**
 * 磨豆机刻度指示器
 * - 点击：打开研磨度抽屉
 */
const GrinderScaleIndicator: React.FC<GrinderScaleIndicatorProps> = ({
  visible = true,
  hapticFeedback = true,
}) => {
  const { grinders, initialized, initialize } = useGrinderStore();
  const [selectedGrinderId, setSelectedGrinderId] = useState<string | null>(
    () =>
      typeof window === 'undefined'
        ? null
        : localStorage.getItem(SELECTED_GRINDER_STORAGE_KEY)
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { inputRef, focusNow } = useInputFocus<HTMLInputElement>();
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化 store
  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  // 清理已经不存在的持久化选择，默认显示仍回退到第一台磨豆机
  useEffect(() => {
    if (selectedGrinderId && !grinders.find(g => g.id === selectedGrinderId)) {
      saveSelectedGrinderId(null);
    }
  }, [grinders, selectedGrinderId]);

  // 当前选中的磨豆机
  const selectedGrinder = useMemo(
    () => grinders.find(g => g.id === selectedGrinderId) ?? grinders[0] ?? null,
    [grinders, selectedGrinderId]
  );

  // 卸载时清理聚焦定时器
  useEffect(
    () => () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    },
    []
  );

  // 处理按钮点击
  const handleClick = () => {
    if (hapticFeedback) hapticsUtils.light();
    setIsDrawerOpen(true);

    // 等抽屉滑入完成后再聚焦输入框。
    // 定时器必须在点击回调里创建：WebKit/Gecko 只把用户手势转发给手势内创建的
    // 一次性定时器（上限 1s），放到 useEffect 里创建就脱离了手势，
    // iOS PWA 会聚焦成功但不弹键盘。
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(focusNow, FOCUS_DELAY_MS);
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    setIsDrawerOpen(false);
  };

  // 处理磨豆机切换
  const handleGrinderChange = (grinderId: string) => {
    setSelectedGrinderId(grinderId);
    saveSelectedGrinderId(grinderId);
  };

  // 没有磨豆机或不显示时返回 null
  if (!visible || !selectedGrinder) return null;

  const scaleText = selectedGrinder.currentGrindSize || '-';

  return (
    <>
      {/* 刻度指示按钮 */}
      <motion.button
        onClick={handleClick}
        className={`${BUTTON_BASE_CLASS} flex h-12.5 w-12.5 cursor-pointer items-center justify-center font-medium text-neutral-800 dark:text-neutral-100`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING_TRANSITION}
      >
        <span
          className={`${getFontSize(scaleText.length)} leading-none font-semibold`}
        >
          {scaleText}
        </span>
      </motion.button>

      {/* 研磨度抽屉 */}
      <GrindSizeDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialGrinderId={selectedGrinder.id}
        onGrinderChange={handleGrinderChange}
        inputRef={inputRef}
      />
    </>
  );
};

export default GrinderScaleIndicator;
