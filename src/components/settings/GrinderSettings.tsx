'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { SettingsOptions } from './Settings';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import hapticsUtils from '@/lib/ui/haptics';
import { useModalHistory, modalHistory } from '@/lib/hooks/useModalHistory';
import { useGrinderStore } from '@/lib/stores/grinderStore';
import { SettingPage, useScrollToHighlightedSetting } from './atomic';
import {
  makeDynamicSettingSearchId,
  makeSettingRowSearchId,
} from './settingsSearch';

interface GrinderSettingsProps {
  settings: SettingsOptions;
  onClose: () => void;
  handleChange: <K extends keyof SettingsOptions>(
    key: K,
    value: SettingsOptions[K]
  ) => void | Promise<void>;
}

const GrinderSettings: React.FC<GrinderSettingsProps> = ({
  settings: _settings,
  onClose,
  handleChange: _handleChange,
}) => {
  // 使用 settingsStore 获取设置
  const settings = useSettingsStore(state => state.settings) as SettingsOptions;

  // 控制动画状态
  const [isVisible, setIsVisible] = useState(false);

  // 用于保存最新的 onClose 引用
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 关闭处理函数（带动画）
  const handleCloseWithAnimation = useCallback(() => {
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('subSettingsClosing'));
    setTimeout(() => {
      onCloseRef.current();
    }, 350);
  }, []);

  // 使用统一的历史栈管理系统
  useModalHistory({
    id: 'grinder-settings',
    isOpen: true,
    onClose: handleCloseWithAnimation,
    skipPageExitTransitionOnHistory: true,
  });

  // UI 返回按钮点击处理
  const handleClose = () => {
    modalHistory.back();
  };

  // 处理显示/隐藏动画（入场动画）
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingStep, setAddingStep] = useState<'none' | 'name' | 'grindSize'>(
    'none'
  );
  const [newGrinderName, setNewGrinderName] = useState('');
  const [newGrindSize, setNewGrindSize] = useState('');

  // 临时输入值存储
  const tempGrindSizeRef = useRef<{ [key: string]: string }>({});

  // 使用 Zustand store 管理磨豆机数据
  const {
    grinders,
    initialized,
    initialize,
    addGrinder: storeAddGrinder,
    updateGrinder,
    deleteGrinder,
  } = useGrinderStore();
  const highlightedSettingId = useScrollToHighlightedSetting(
    `${grinders.map(grinder => grinder.id).join('\n')}:${addingStep}`
  );
  const isSearchRowHighlighted = React.useCallback(
    (label: string) => highlightedSettingId === makeSettingRowSearchId(label),
    [highlightedSettingId]
  );
  const getSearchHighlightClass = React.useCallback(
    (label: string) =>
      isSearchRowHighlighted(label)
        ? 'bg-neutral-200/70 dark:bg-neutral-700/45'
        : '',
    [isSearchRowHighlighted]
  );
  // 初始化 store
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const handleAddGrinder = () => {
    if (!newGrinderName.trim() || !newGrindSize.trim()) return;

    storeAddGrinder({
      name: newGrinderName.trim(),
      currentGrindSize: newGrindSize.trim(),
    });

    setNewGrinderName('');
    setNewGrindSize('');
    setAddingStep('none');
    settings.hapticFeedback && hapticsUtils.light();
  };

  const handleGrindSizeBlur = (grinderId: string) => {
    const newSize = tempGrindSizeRef.current[grinderId];
    if (newSize !== undefined) {
      updateGrinder(grinderId, {
        currentGrindSize: newSize.trim() || undefined,
      });
      delete tempGrindSizeRef.current[grinderId];
      settings.hapticFeedback && hapticsUtils.light();
    }
    setEditingId(null);
  };

  const handleDeleteGrinder = (grinderId: string) => {
    deleteGrinder(grinderId);
    setDeletingId(null);
    settings.hapticFeedback && hapticsUtils.medium();
  };

  // 点击容器外重置删除状态
  useEffect(() => {
    if (deletingId) {
      const handleClick = () => setDeletingId(null);
      // 延迟添加监听器，避免立即触发
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClick);
      };
    }
  }, [deletingId]);

  return (
    <SettingPage title="磨豆机" isVisible={isVisible} onClose={handleClose}>
      {/* 顶部渐变阴影 */}
      <div className="-mt-4 space-y-4 px-6">
        {/* 磨豆机列表 */}
        {grinders.map(grinder => {
          const isEditing = editingId === grinder.id;
          const grinderSearchId = makeDynamicSettingSearchId(
            'grinder',
            grinder.id
          );
          const isSearchHighlighted = highlightedSettingId === grinderSearchId;
          return (
            <div
              key={grinder.id}
              data-settings-search-id={grinderSearchId}
              className={`flex items-center justify-between gap-3 rounded bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800 transition-colors duration-200 dark:bg-neutral-800 dark:text-neutral-200 ${
                isSearchHighlighted
                  ? 'bg-neutral-200/70 dark:bg-neutral-700/45'
                  : ''
              }`}
            >
              <div className="flex flex-1 items-center gap-2">
                {grinder.name}
                <span>·</span>
                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={grinder.currentGrindSize || ''}
                    onChange={e =>
                      (tempGrindSizeRef.current[grinder.id] = e.target.value)
                    }
                    onBlur={() => handleGrindSizeBlur(grinder.id)}
                    placeholder="当前刻度"
                    autoFocus
                    className="flex-1 appearance-none bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditingId(grinder.id);
                      tempGrindSizeRef.current[grinder.id] =
                        grinder.currentGrindSize || '';
                    }}
                    className="cursor-pointer"
                  >
                    {grinder.currentGrindSize || '点击设置刻度'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (deletingId === grinder.id) {
                    handleDeleteGrinder(grinder.id);
                  } else {
                    setDeletingId(grinder.id);
                  }
                }}
                className={`text-xs font-medium transition-colors ${
                  deletingId === grinder.id
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400'
                }`}
              >
                {deletingId === grinder.id ? '确认删除' : '删除'}
              </button>
            </div>
          );
        })}

        {/* 添加新磨豆机 */}
        {addingStep === 'name' ? (
          <div className="flex items-center gap-2 rounded bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
            <input
              type="text"
              value={newGrinderName}
              onChange={e => setNewGrinderName(e.target.value)}
              onBlur={() => {
                if (!newGrinderName.trim()) {
                  setAddingStep('none');
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && newGrinderName.trim()) {
                  setAddingStep('grindSize');
                } else if (e.key === 'Escape') {
                  setAddingStep('none');
                  setNewGrinderName('');
                }
              }}
              placeholder="输入磨豆机名称"
              autoFocus
              className="flex-1 appearance-none bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={() =>
                newGrinderName.trim() && setAddingStep('grindSize')
              }
              disabled={!newGrinderName.trim()}
              className="text-xs font-medium text-neutral-800 transition-colors hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:text-neutral-100"
            >
              下一步
            </button>
          </div>
        ) : addingStep === 'grindSize' ? (
          <div className="flex items-center gap-2 rounded bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {newGrinderName}
            </span>
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              ·
            </span>
            <input
              type="text"
              value={newGrindSize}
              onChange={e => setNewGrindSize(e.target.value)}
              onBlur={() => {
                if (!newGrindSize.trim()) {
                  setAddingStep('name');
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddGrinder();
                } else if (e.key === 'Escape') {
                  setAddingStep('name');
                  setNewGrindSize('');
                }
              }}
              placeholder="输入当前刻度"
              autoFocus
              className="flex-1 appearance-none bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={handleAddGrinder}
              disabled={!newGrindSize.trim()}
              className="ml-auto text-xs font-medium text-neutral-800 transition-colors hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:text-neutral-100"
            >
              添加
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-settings-search-id={makeSettingRowSearchId('添加磨豆机')}
            onClick={() => setAddingStep('name')}
            className={`flex w-full items-center justify-center gap-2 rounded bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 ${getSearchHighlightClass('添加磨豆机')}`}
          >
            <Plus className="h-4 w-4" />
            添加磨豆机
          </button>
        )}

        {/* 底部空间 */}
        <div className="h-16" />
      </div>
    </SettingPage>
  );
};

export default GrinderSettings;
