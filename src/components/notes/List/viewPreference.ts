import { getObjectState, saveObjectState } from '@/lib/core/statePersistence';
import type { NotesViewMode } from '../types';

export interface NotesViewPreference {
  viewMode: NotesViewMode;
  imageFlowType: 'normal' | 'date';
}

const DEFAULT_PREFERENCE: NotesViewPreference = {
  viewMode: 'list',
  imageFlowType: 'normal',
};

// 兼容旧的四个存储键；新选择只保存一份完整偏好。
export function getNotesViewPreference(): NotesViewPreference {
  let fallback = DEFAULT_PREFERENCE;
  if (typeof window !== 'undefined') {
    try {
      const viewMode = localStorage.getItem('notes-view-mode');
      const lastType = localStorage.getItem('notes-last-image-flow-type');
      const date =
        localStorage.getItem('notes-is-date-image-flow-mode') === 'true';
      const normal =
        localStorage.getItem('notes-is-image-flow-mode') === 'true';
      fallback = {
        viewMode:
          viewMode === 'gallery' || viewMode === 'table' ? viewMode : 'list',
        imageFlowType:
          viewMode === 'gallery' && (date || normal)
            ? date
              ? 'date'
              : 'normal'
            : lastType === 'date'
              ? 'date'
              : 'normal',
      };
    } catch {
      // 存储不可用时使用默认视图。
    }
  }

  const saved = getObjectState<NotesViewPreference | null>(
    'brewing-notes',
    'viewPreference',
    null
  );
  return saved &&
    ['list', 'gallery', 'table'].includes(saved.viewMode) &&
    ['normal', 'date'].includes(saved.imageFlowType)
    ? saved
    : fallback;
}

export function saveNotesViewPreference(preference: NotesViewPreference): void {
  saveObjectState('brewing-notes', 'viewPreference', preference);
}
