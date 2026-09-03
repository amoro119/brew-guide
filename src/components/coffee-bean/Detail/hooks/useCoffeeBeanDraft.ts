'use client';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CoffeeBean } from '@/types/app';
import { prepareCoffeeBeanRoasterFieldsForFormDraft } from '@/lib/utils/coffeeBeanUtils';
import {
  clearCoffeeBeanFormDraftSession,
  hasCoffeeBeanFormDraftContent,
  loadCoffeeBeanFormDraftSession,
  normalizeCoffeeBeanFormDraft,
  saveCoffeeBeanFormDraftSession,
} from '../coffeeBeanFormDraft';

interface UseCoffeeBeanDraftOptions {
  isAddMode: boolean;
  isEditMode: boolean;
  isFormMode: boolean;
  isOpen: boolean;
  propBean: CoffeeBean | null;
  persistedBean: CoffeeBean | null;
  initialBeanState: 'green' | 'roasted';
  roasterFieldEnabled?: boolean;
  roasterSeparator?: ' ' | '/';
}

const createBlendComponent = () => ({
  origin: '',
  country: '',
  region: '',
  estate: '',
  processingStation: '',
  altitude: '',
  process: '',
  batch: '',
  variety: '',
});

export const useCoffeeBeanDraft = ({
  isAddMode,
  isEditMode,
  isFormMode,
  isOpen,
  propBean,
  persistedBean,
  initialBeanState,
  roasterFieldEnabled,
  roasterSeparator,
}: UseCoffeeBeanDraftOptions) => {
  const createTempBean = useCallback(
    (sourceBean?: CoffeeBean | null): Partial<CoffeeBean> =>
      prepareCoffeeBeanRoasterFieldsForFormDraft(
        sourceBean
          ? {
              ...sourceBean,
              blendComponents: sourceBean.blendComponents?.length
                ? sourceBean.blendComponents
                : [createBlendComponent()],
            }
          : {
              name: '',
              beanState: initialBeanState,
              beanType: 'filter',
              capacity: '',
              remaining: '',
              roastLevel: '',
              roastDate: '',
              purchaseDate: '',
              flavor: [],
              notes: '',
              blendComponents: [createBlendComponent()],
            },
        {
          roasterFieldEnabled,
          separator: roasterSeparator,
        }
      ),
    [initialBeanState, roasterFieldEnabled, roasterSeparator]
  );

  const initialBean = useMemo(
    () => createTempBean(isEditMode || isAddMode ? propBean : null),
    [createTempBean, isAddMode, isEditMode, propBean]
  );
  const [tempBean, setTempBean] = useState<Partial<CoffeeBean>>(initialBean);
  const baselineTempBean = useMemo(
    () =>
      createTempBean(isEditMode ? persistedBean : isAddMode ? propBean : null),
    [createTempBean, isAddMode, isEditMode, persistedBean, propBean]
  );
  const latestTempBeanRef = useRef(tempBean);
  const latestHasDraftContentRef = useRef(false);
  const shouldAutoPersistDraftRef = useRef(true);

  useLayoutEffect(() => {
    if (!isFormMode || !isOpen) return;

    shouldAutoPersistDraftRef.current = true;
    const baseBean = createTempBean(
      isEditMode ? persistedBean : isAddMode ? propBean : null
    );

    if (isAddMode) {
      const savedDraft = propBean ? null : loadCoffeeBeanFormDraftSession();
      // Reset the editable snapshot when the modal opens or its source bean changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempBean(
        savedDraft
          ? prepareCoffeeBeanRoasterFieldsForFormDraft(savedDraft.bean, {
              roasterFieldEnabled,
              separator: roasterSeparator,
            })
          : baseBean
      );
      return;
    }

    setTempBean(baseBean);
  }, [
    createTempBean,
    isAddMode,
    isEditMode,
    isFormMode,
    isOpen,
    persistedBean,
    propBean,
    roasterFieldEnabled,
    roasterSeparator,
  ]);

  const hasAddDraftContent = useMemo(
    () =>
      isAddMode && hasCoffeeBeanFormDraftContent(tempBean, baselineTempBean),
    [baselineTempBean, isAddMode, tempBean]
  );

  useEffect(() => {
    latestTempBeanRef.current = tempBean;
    latestHasDraftContentRef.current = hasAddDraftContent;
  }, [hasAddDraftContent, tempBean]);

  const persistAddDraftSnapshot = useCallback(() => {
    if (
      !isAddMode ||
      !shouldAutoPersistDraftRef.current ||
      !latestHasDraftContentRef.current
    ) {
      return;
    }

    saveCoffeeBeanFormDraftSession({
      version: 1,
      bean: normalizeCoffeeBeanFormDraft(latestTempBeanRef.current),
      updatedAt: Date.now(),
    });
  }, [isAddMode]);

  useEffect(() => {
    if (!isOpen || !isAddMode) return;

    const handlePageHide = () => persistAddDraftSnapshot();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistAddDraftSnapshot();
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let removeAppStateListener: (() => void) | undefined;
    let isDisposed = false;

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) persistAddDraftSnapshot();
      }).then(listener => {
        if (isDisposed) {
          listener.remove();
          return;
        }
        removeAppStateListener = () => listener.remove();
      });
    }

    return () => {
      isDisposed = true;
      persistAddDraftSnapshot();
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeAppStateListener?.();
    };
  }, [isAddMode, isOpen, persistAddDraftSnapshot]);

  const disableAutoPersist = useCallback(() => {
    shouldAutoPersistDraftRef.current = false;
  }, []);

  const saveDraft = useCallback(() => {
    if (!hasAddDraftContent) return false;

    saveCoffeeBeanFormDraftSession({
      version: 1,
      bean: normalizeCoffeeBeanFormDraft(tempBean),
      updatedAt: Date.now(),
    });
    return true;
  }, [hasAddDraftContent, tempBean]);

  const clearDraft = useCallback(() => {
    clearCoffeeBeanFormDraftSession();
  }, []);

  return {
    tempBean,
    setTempBean,
    hasAddDraftContent,
    hasDraftContentRef: latestHasDraftContentRef,
    disableAutoPersist,
    saveDraft,
    clearDraft,
  };
};
