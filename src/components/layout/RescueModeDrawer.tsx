'use client';

import React, { useCallback, useEffect, useReducer } from 'react';
import ActionDrawer from '@/components/common/ui/ActionDrawer';
import { showToast } from '@/components/common/feedback/LightToast';
import {
  exportRescueData,
  getRescueModeSnapshot,
  RESCUE_MODE_OPEN_EVENT,
  type RescueModeSnapshot,
} from '@/lib/rescue/rescueMode';

const formatBytes = (value?: number): string => {
  if (!Number.isFinite(value)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value || 0;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
};

const snapshotRows = (
  snapshot: RescueModeSnapshot
): Array<[string, React.ReactNode]> => [
  ['咖啡豆', snapshot.beans],
  ['咖啡豆原图', snapshot.beanImages],
  ['咖啡豆缩略图', snapshot.beanThumbnails],
  ['冲煮笔记', snapshot.notes],
  ['笔记原图', snapshot.noteImages],
  ['笔记缩略图', snapshot.noteThumbnails],
  ['自定义器具', snapshot.customEquipments],
  ['自定义方案', snapshot.customMethods],
  ['磨豆机', snapshot.grinders],
  ['本地键', snapshot.localStorageKeys],
];

const RescueInfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between border-b border-neutral-200/50 py-1 dark:border-neutral-800/60">
    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-medium text-neutral-900 dark:text-neutral-100">
      {value}
    </span>
  </div>
);

interface RescueModeDrawerState {
  isOpen: boolean;
  snapshot: RescueModeSnapshot | null;
  isLoading: boolean;
  isExporting: boolean;
  lastExportSize: string | null;
}

type RescueModeDrawerAction =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'previewStarted' }
  | { type: 'previewSucceeded'; snapshot: RescueModeSnapshot }
  | { type: 'previewFailed' }
  | { type: 'exportStarted' }
  | { type: 'exportSucceeded'; size: string }
  | { type: 'exportFailed' };

const initialState: RescueModeDrawerState = {
  isOpen: false,
  snapshot: null,
  isLoading: false,
  isExporting: false,
  lastExportSize: null,
};

const rescueModeDrawerReducer = (
  state: RescueModeDrawerState,
  action: RescueModeDrawerAction
): RescueModeDrawerState => {
  switch (action.type) {
    case 'open':
      return { ...state, isOpen: true };
    case 'close':
      return { ...state, isOpen: false };
    case 'previewStarted':
      return { ...state, isLoading: true };
    case 'previewSucceeded':
      return { ...state, isLoading: false, snapshot: action.snapshot };
    case 'previewFailed':
      return { ...state, isLoading: false };
    case 'exportStarted':
      return { ...state, isExporting: true };
    case 'exportSucceeded':
      return {
        ...state,
        isExporting: false,
        lastExportSize: action.size,
      };
    case 'exportFailed':
      return { ...state, isExporting: false };
  }
};

const RescueModeDrawer: React.FC = () => {
  const [state, dispatch] = useReducer(rescueModeDrawerReducer, initialState);
  const { isOpen, snapshot, isLoading, isExporting, lastExportSize } = state;

  const refreshSnapshot = useCallback(async () => {
    dispatch({ type: 'previewStarted' });
    try {
      dispatch({
        type: 'previewSucceeded',
        snapshot: await getRescueModeSnapshot(),
      });
    } catch (error) {
      console.error('加载抢救模式快照失败:', error);
      dispatch({ type: 'previewFailed' });
      showToast({ type: 'error', title: '数据预览失败' });
    }
  }, []);

  useEffect(() => {
    const open = () => {
      dispatch({ type: 'open' });
      void refreshSnapshot();
    };

    window.addEventListener(RESCUE_MODE_OPEN_EVENT, open);
    return () => window.removeEventListener(RESCUE_MODE_OPEN_EVENT, open);
  }, [refreshSnapshot]);

  const handleExport = async () => {
    if (isExporting) return;

    dispatch({ type: 'exportStarted' });
    try {
      const [{ exportJsonFile }, jsonData] = await Promise.all([
        import('@/lib/utils/jsonExport'),
        exportRescueData(),
      ]);
      await exportJsonFile({
        jsonData,
        fileName: `brew-guide-rescue-${new Date().toISOString().slice(0, 10)}.json`,
        title: '导出抢救数据',
        text: '请选择保存位置',
        dialogTitle: '导出抢救数据',
      });
      dispatch({
        type: 'exportSucceeded',
        size: formatBytes(jsonData.length),
      });
      showToast({ type: 'success', title: '已导出数据' });
    } catch (error) {
      console.error('抢救导出失败:', error);
      dispatch({ type: 'exportFailed' });
      showToast({ type: 'error', title: '导出失败' });
    }
  };

  return (
    <ActionDrawer
      isOpen={isOpen}
      onClose={() => dispatch({ type: 'close' })}
      historyId="rescue-mode"
    >
      <ActionDrawer.Content>
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              抢救模式
            </p>
            <p className="leading-5 text-neutral-500 dark:text-neutral-400">
              仅读取计数和存储估算。导出核心数据，不加载原图。
            </p>
          </div>

          <div className="space-y-2">
            {isLoading || !snapshot ? (
              <p className="text-neutral-500 dark:text-neutral-400">
                正在读取预览...
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {snapshotRows(snapshot).map(([label, value]) => (
                    <RescueInfoRow key={label} label={label} value={value} />
                  ))}
                </div>

                <div className="space-y-1">
                  <RescueInfoRow
                    label="存储占用"
                    value={formatBytes(snapshot.storageUsage)}
                  />
                  <RescueInfoRow
                    label="存储上限"
                    value={formatBytes(snapshot.storageQuota)}
                  />
                  <RescueInfoRow label="应用版本" value={snapshot.appVersion} />
                  {lastExportSize !== null ? (
                    <RescueInfoRow label="上次导出" value={lastExportSize} />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </ActionDrawer.Content>
      <ActionDrawer.Actions>
        <ActionDrawer.SecondaryButton
          onClick={() => dispatch({ type: 'close' })}
        >
          关闭
        </ActionDrawer.SecondaryButton>
        <ActionDrawer.PrimaryButton
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? '正在导出' : '导出数据'}
        </ActionDrawer.PrimaryButton>
      </ActionDrawer.Actions>
    </ActionDrawer>
  );
};

export default RescueModeDrawer;
