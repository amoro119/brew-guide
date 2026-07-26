'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import ActionDrawer from '@/components/common/ui/ActionDrawer';
import { type CustomEquipment, type Method } from '@/lib/core/config';
import { canTransferMethod } from '@/lib/brewing/methodTransfer';
import { getCommonMethodsForEquipment } from '@/lib/brewing/methodAvailability';
import { createEditableEquipmentFromPreset } from '@/lib/equipment/editableEquipment';
import { equipmentUtils } from '@/lib/equipment/equipmentUtils';
import { useCustomEquipmentStore } from '@/lib/stores/customEquipmentStore';
import { useCustomMethodStore } from '@/lib/stores/customMethodStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';

/** 可作为导入来源的器具及其方案 */
export interface MethodImportSource {
  id: string;
  name: string;
  equipment: CustomEquipment;
  customMethods: Method[];
  presetMethods: Method[];
  methodCount: number;
}

interface UseMethodImportSourcesOptions {
  /** 当前器具（导入目标） */
  targetEquipment?: CustomEquipment;
  /** 是否需要加载数据，抽屉关闭时不必加载 */
  enabled: boolean;
}

const getMethodKey = (method: Method) => method.id || method.name;

/**
 * 收集其他器具中可以导入到当前器具的方案
 */
export const useMethodImportSources = ({
  targetEquipment,
  enabled,
}: UseMethodImportSourcesOptions): MethodImportSource[] => {
  const customEquipments = useCustomEquipmentStore(state => state.equipments);
  const equipmentsInitialized = useCustomEquipmentStore(
    state => state.initialized
  );
  const loadEquipments = useCustomEquipmentStore(state => state.loadEquipments);
  const methodsByEquipment = useCustomMethodStore(
    state => state.methodsByEquipment
  );
  const methodsInitialized = useCustomMethodStore(state => state.initialized);
  const loadMethods = useCustomMethodStore(state => state.loadMethods);
  const settings = useSettingsStore(state => state.settings);

  useEffect(() => {
    if (!enabled) return;
    if (!equipmentsInitialized) void loadEquipments();
    if (!methodsInitialized) void loadMethods();
  }, [
    enabled,
    equipmentsInitialized,
    loadEquipments,
    loadMethods,
    methodsInitialized,
  ]);

  return useMemo(() => {
    if (!enabled || !targetEquipment) return [];

    const hiddenEquipmentIds = settings.hiddenEquipments || [];
    const hiddenCommonMethods = settings.hiddenCommonMethods || {};
    const targetPresetNames = new Set(
      getCommonMethodsForEquipment(targetEquipment.id, customEquipments).map(
        method => method.name
      )
    );

    // 无步骤方案同样可以导入，只需要排除意式与手冲互相复制的情况
    const isImportable = (method: Method, sourceEquipment: CustomEquipment) =>
      canTransferMethod(method, sourceEquipment, targetEquipment);

    return equipmentUtils
      .getAllEquipments(
        customEquipments,
        { equipmentIds: settings.equipmentOrder || [] },
        settings.equipmentNameOverrides
      )
      .filter(
        equipment =>
          equipment.id !== targetEquipment.id &&
          !hiddenEquipmentIds.includes(equipment.id)
      )
      .map(equipment => {
        const sourceEquipment = equipment.isCustom
          ? (equipment as CustomEquipment)
          : createEditableEquipmentFromPreset(equipment);
        const hiddenMethodIds = hiddenCommonMethods[equipment.id] || [];

        const customMethods = (methodsByEquipment[equipment.id] || []).filter(
          method => isImportable(method, sourceEquipment)
        );
        // 目标器具已有的预设方案不重复提供
        const presetMethods = getCommonMethodsForEquipment(
          equipment.id,
          customEquipments
        ).filter(
          method =>
            !targetPresetNames.has(method.name) &&
            !hiddenMethodIds.includes(getMethodKey(method)) &&
            isImportable(method, sourceEquipment)
        );

        return {
          id: equipment.id,
          name: equipment.name,
          equipment: sourceEquipment,
          customMethods,
          presetMethods,
          methodCount: customMethods.length + presetMethods.length,
        };
      })
      .filter(source => source.methodCount > 0);
  }, [
    customEquipments,
    enabled,
    methodsByEquipment,
    settings.equipmentNameOverrides,
    settings.equipmentOrder,
    settings.hiddenCommonMethods,
    settings.hiddenEquipments,
    targetEquipment,
  ]);
};

const EMPTY_SCROLL_FADE = { top: false, bottom: false };

/**
 * 可滚动的选项列表，超出高度时显示上下渐隐
 */
const PickerList: React.FC<{
  children: React.ReactNode;
  /** 内容变化时重新计算渐隐状态 */
  refreshKey?: string;
}> = ({ children, refreshKey }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollFade, setScrollFade] = useState(EMPTY_SCROLL_FADE);

  const updateScrollFade = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const canScroll = element.scrollHeight > element.clientHeight + 1;
    const nextFade = {
      top: canScroll && element.scrollTop > 1,
      bottom:
        canScroll &&
        element.scrollTop + element.clientHeight < element.scrollHeight - 1,
    };

    setScrollFade(current =>
      current.top === nextFade.top && current.bottom === nextFade.bottom
        ? current
        : nextFade
    );
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollFade);
    const element = scrollContainerRef.current;
    const resizeObserver =
      element && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateScrollFade)
        : null;

    resizeObserver?.observe(element as Element);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [refreshKey, updateScrollFade]);

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollFade}
        className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
      <div
        className={`fade-mask-to-b pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-white transition-opacity duration-200 dark:bg-neutral-900 ${
          scrollFade.top ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`fade-mask-to-t pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-white transition-opacity duration-200 dark:bg-neutral-900 ${
          scrollFade.bottom ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

function PickerRow<T>({
  value,
  label,
  hint,
  disabled = false,
  onClick,
}: {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: (value: T) => void;
}) {
  const handleClick = useCallback(() => onClick(value), [onClick, value]);

  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={handleClick}
      disabled={disabled}
      className={`flex w-full shrink-0 items-center justify-between gap-3 rounded-full bg-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:bg-neutral-800 dark:text-white ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="shrink-0 text-xs font-normal text-neutral-500 dark:text-neutral-400">
          {hint}
        </span>
      )}
    </motion.button>
  );
}

/**
 * 三段短线，替代原生边框虚线，降低视觉重量
 */
const DashTrio: React.FC = () => (
  <span aria-hidden className="flex items-center gap-1">
    <span className="h-px w-2 bg-neutral-200/50 dark:bg-neutral-800/50" />
    <span className="h-px w-2 bg-neutral-200/50 dark:bg-neutral-800/50" />
    <span className="h-px w-2 bg-neutral-200/50 dark:bg-neutral-800/50" />
  </span>
);

/**
 * 分割线，仅保留居中的三段短线
 */
export const PickerDivider: React.FC = () => (
  <div className="flex shrink-0 items-center justify-center py-1">
    <DashTrio />
  </div>
);

/**
 * 分组标题，与列表项左对齐，不带任何分割线
 */
export const PickerGroupTitle: React.FC<{ label: string }> = ({ label }) => (
  <div className="shrink-0 px-4 pt-2 pb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
    {label}
  </div>
);

/**
 * 步骤一：选择来源器具
 */
export const EquipmentSourceStep: React.FC<{
  sources: MethodImportSource[];
  onSelect: (sourceId: string) => void;
  onBack: () => void;
}> = ({ sources, onSelect, onBack }) => (
  <>
    <ActionDrawer.Content>
      <p className="text-neutral-500 dark:text-neutral-400">
        {sources.length > 0 ? (
          <>
            选择要导入方案的
            <span className="text-neutral-800 dark:text-neutral-200">
              来源器具
            </span>
            。
          </>
        ) : (
          '其他器具暂时没有可以导入的方案。'
        )}
      </p>
    </ActionDrawer.Content>

    <div className="flex flex-col gap-2">
      {sources.length > 0 && (
        <PickerList refreshKey={`equipments-${sources.length}`}>
          {sources.map(source => (
            <PickerRow
              key={source.id}
              value={source.id}
              label={source.name}
              hint={`${source.methodCount} 个方案`}
              onClick={onSelect}
            />
          ))}
        </PickerList>
      )}

      <ActionDrawer.SecondaryButton onClick={onBack}>
        返回
      </ActionDrawer.SecondaryButton>
    </div>
  </>
);

/**
 * 步骤二：选择要导入的方案
 */
export const SourceMethodStep: React.FC<{
  source: MethodImportSource;
  /** 当前器具已有的自定义方案名称 */
  existingMethodNames: string[];
  onSelect: (method: Method) => void;
  onBack: () => void;
}> = ({ source, existingMethodNames, onSelect, onBack }) => {
  const existingNames = useMemo(
    () => new Set(existingMethodNames.map(name => name.trim())),
    [existingMethodNames]
  );
  const showGroupTitles =
    source.customMethods.length > 0 && source.presetMethods.length > 0;

  const renderMethodRow = (method: Method) => {
    const isExisting = existingNames.has(method.name.trim());

    return (
      <PickerRow
        key={getMethodKey(method)}
        value={method}
        label={method.name}
        hint={isExisting ? '已存在' : undefined}
        disabled={isExisting}
        onClick={onSelect}
      />
    );
  };

  return (
    <>
      <ActionDrawer.Content>
        <p className="text-neutral-500 dark:text-neutral-400">
          选择要从
          <span className="text-neutral-800 dark:text-neutral-200">
            {source.name}
          </span>
          导入的方案。
        </p>
      </ActionDrawer.Content>

      <div className="flex flex-col gap-2">
        <PickerList refreshKey={`${source.id}-${source.methodCount}`}>
          {source.customMethods.length > 0 && (
            <>
              {showGroupTitles && <PickerGroupTitle label="自定义方案" />}
              {source.customMethods.map(renderMethodRow)}
            </>
          )}
          {source.presetMethods.length > 0 && (
            <>
              {showGroupTitles && <PickerGroupTitle label="预设方案" />}
              {source.presetMethods.map(renderMethodRow)}
            </>
          )}
        </PickerList>

        <ActionDrawer.SecondaryButton onClick={onBack}>
          返回
        </ActionDrawer.SecondaryButton>
      </div>
    </>
  );
};
