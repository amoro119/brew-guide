'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ExtendedCoffeeBean } from './types';
import CoffeeBeanForm, {
  type CoffeeBeanDrawerPage,
  type CoffeeBeanFormHandle,
} from './index';
import PageStackDrawer, {
  useDrawerPageStack,
} from '@/components/common/ui/PageStackDrawer';
import { modalHistory } from '@/lib/hooks/useModalHistory';
import { mergeBeanWithStoredImages } from '@/lib/coffee-beans/imageRepository';

interface CoffeeBeanFormModalProps {
  showForm: boolean;
  initialBean?: ExtendedCoffeeBean | null;
  onSave: (bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>) => void;
  onClose: () => void;
  isRepurchasing?: boolean;
  onRepurchase?: () => void;
  initialBeanState?: 'green' | 'roasted';
  /** 当前是否处于“生豆转熟豆”烘焙流程（来源生豆ID） */
  roastingSourceBeanId?: string | null;
  /** 识别时使用的原始图片 base64（用于在表单中显示） */
  recognitionImage?: string | null;
}

const CoffeeBeanFormModal: React.FC<CoffeeBeanFormModalProps> = ({
  showForm,
  initialBean,
  onSave,
  onClose,
  isRepurchasing = false,
  onRepurchase,
  initialBeanState,
  roastingSourceBeanId,
  recognitionImage,
}) => {
  const formRef = useRef<CoffeeBeanFormHandle>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isIOS] = useState(
    () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  );
  const [hydratedBeanState, setHydratedBeanState] = useState<{
    source: ExtendedCoffeeBean;
    bean: ExtendedCoffeeBean;
  } | null>(null);
  const hydratedInitialBean =
    hydratedBeanState && hydratedBeanState.source === initialBean
      ? hydratedBeanState.bean
      : initialBean || null;
  const formContextKey = `${hydratedInitialBean?.id || 'new'}-${
    hydratedInitialBean?.name || ''
  }-${initialBeanState || 'roasted'}`;
  const [validityState, setValidityState] = useState({
    key: '',
    canSave: false,
  });
  const canSave = validityState.key === formContextKey && validityState.canSave;
  const [imageSourceTarget, setImageSourceTarget] = useState<'front' | 'back'>(
    'front'
  );

  const pageStack = useDrawerPageStack<CoffeeBeanDrawerPage>(
    'form',
    showForm,
    'bean-form',
    onClose
  );

  useEffect(() => {
    let cancelled = false;

    if (!showForm || !initialBean?.id) return;

    mergeBeanWithStoredImages(initialBean).then(bean => {
      if (!cancelled) {
        setHydratedBeanState({ source: initialBean, bean });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showForm, initialBean]);

  useEffect(() => {
    if (!showForm) return;

    const content = contentRef.current;
    if (!content) return;

    const handleInputFocus = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        !isIOS ||
        !target ||
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return;
      }

      window.setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    content.addEventListener('focusin', handleInputFocus);
    return () => content.removeEventListener('focusin', handleInputFocus);
  }, [isIOS, showForm]);

  const handleClose = useCallback(() => {
    modalHistory.back();
  }, []);

  const handleDone = useCallback(() => {
    if (pageStack.currentPage === 'image-source') {
      pageStack.back();
      return;
    }

    formRef.current?.done();
  }, [pageStack]);

  const handleBack = useCallback(() => {
    if (pageStack.currentPage === 'image-source') {
      pageStack.back();
      return;
    }

    handleClose();
  }, [handleClose, pageStack]);

  const handleOpenImageSourcePage = useCallback(
    (target: 'front' | 'back') => {
      setImageSourceTarget(target);
      pageStack.push('image-source');
    },
    [pageStack]
  );

  const handleValidityChange = useCallback(
    (nextCanSave: boolean) => {
      setValidityState({ key: formContextKey, canSave: nextCanSave });
    },
    [formContextKey]
  );

  const title = isRepurchasing
    ? '续购咖啡豆'
    : roastingSourceBeanId
      ? '烘焙咖啡豆'
      : initialBean
        ? '编辑咖啡豆'
        : '添加咖啡豆';
  const isImageSourcePage = pageStack.currentPage === 'image-source';

  return (
    <PageStackDrawer
      isOpen={showForm}
      title={isImageSourcePage ? '选择图片' : title}
      activeKey={`${pageStack.currentPage}-bean-form-${hydratedInitialBean?.id || 'new'}`}
      canGoBack={isImageSourcePage}
      doneDisabled={!isImageSourcePage && !canSave}
      onCancel={handleClose}
      onBack={handleBack}
      onDone={handleDone}
      historyId="bean-form"
    >
      {showForm && (
        <div ref={contentRef} data-modal="coffee-bean-form">
          <CoffeeBeanForm
            key={`bean-form-${formContextKey}`}
            ref={formRef}
            onSave={onSave}
            onValidityChange={handleValidityChange}
            initialBean={hydratedInitialBean || undefined}
            isRepurchasing={isRepurchasing}
            onRepurchase={onRepurchase}
            initialBeanState={initialBeanState}
            roastingSourceBeanId={roastingSourceBeanId}
            recognitionImage={recognitionImage}
            activeDrawerPage={pageStack.currentPage}
            imageSourceTarget={imageSourceTarget}
            onOpenImageSourcePage={handleOpenImageSourcePage}
            onCloseImageSourcePage={pageStack.back}
          />
        </div>
      )}
    </PageStackDrawer>
  );
};

export default CoffeeBeanFormModal;
