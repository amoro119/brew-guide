'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { motion, useAnimationControls } from 'framer-motion';

import { useMultiStepModalHistory } from '@/lib/hooks/useModalHistory';
import { modalHistory } from '@/lib/navigation/modalHistory';
import { useThemeColor } from '@/lib/hooks/useThemeColor';
import { DRAWER_TRANSITION } from './ActionDrawer';

export interface PageStackDrawerAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PageStackDrawerProps {
  isOpen: boolean;
  title: string;
  activeKey: string;
  canGoBack: boolean;
  doneLabel?: string;
  doneActions?: PageStackDrawerAction[];
  backLabel?: string;
  doneDisabled?: boolean;
  onCancel: () => void;
  onBack: () => void;
  onDone: () => void;
  children: React.ReactNode;
  historyId: string;
}

type PageStackDrawerSnapshot = Pick<
  PageStackDrawerProps,
  | 'title'
  | 'activeKey'
  | 'canGoBack'
  | 'doneLabel'
  | 'doneActions'
  | 'backLabel'
  | 'doneDisabled'
  | 'children'
>;

export function useDrawerPageStack<PageKey extends string>(
  initialPage: PageKey,
  isOpen: boolean,
  historyId: string,
  onClose: () => void
) {
  const [stack, setStack] = React.useState<PageKey[]>([initialPage]);

  React.useEffect(() => {
    if (!isOpen) {
      setStack([initialPage]);
    }
  }, [initialPage, isOpen]);

  useMultiStepModalHistory({
    id: historyId,
    isOpen,
    step: stack.length,
    onStepChange: step => {
      setStack(current => current.slice(0, Math.max(1, step)));
    },
    onClose,
  });

  const push = React.useCallback((page: PageKey) => {
    setStack(current => [...current, page]);
  }, []);

  const replace = React.useCallback((page: PageKey) => {
    setStack(current =>
      current.length === 0 ? [page] : [...current.slice(0, -1), page]
    );
  }, []);

  const back = React.useCallback(() => {
    modalHistory.back();
  }, []);

  const reset = React.useCallback(() => {
    setStack([initialPage]);
  }, [initialPage]);

  return {
    currentPage: stack[stack.length - 1] || initialPage,
    depth: stack.length,
    canGoBack: stack.length > 1,
    push,
    replace,
    back,
    reset,
  };
}

const PageStackDrawer: React.FC<PageStackDrawerProps> = ({
  isOpen,
  title,
  activeKey,
  canGoBack,
  doneLabel = '完成',
  doneActions,
  backLabel,
  doneDisabled = false,
  onCancel,
  onBack,
  onDone,
  children,
}) => {
  const isOpenRef = React.useRef(isOpen);
  const currentSnapshot: PageStackDrawerSnapshot = {
    title,
    activeKey,
    canGoBack,
    doneLabel,
    doneActions,
    backLabel,
    doneDisabled,
    children,
  };
  const [closingSnapshot, setClosingSnapshot] =
    React.useState<PageStackDrawerSnapshot>(currentSnapshot);
  const pageControls = useAnimationControls();
  const visibleSnapshot = isOpen ? currentSnapshot : closingSnapshot;

  useThemeColor({ useOverlay: true, enabled: isOpen });

  if (
    isOpen &&
    (closingSnapshot.title !== title ||
      closingSnapshot.activeKey !== activeKey ||
      closingSnapshot.canGoBack !== canGoBack ||
      closingSnapshot.doneLabel !== doneLabel ||
      closingSnapshot.doneActions !== doneActions ||
      closingSnapshot.backLabel !== backLabel ||
      closingSnapshot.doneDisabled !== doneDisabled ||
      closingSnapshot.children !== children)
  ) {
    setClosingSnapshot(currentSnapshot);
  }

  React.useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        if (canGoBack) {
          onBack();
          return;
        }
        onCancel();
      }
    },
    [canGoBack, onBack, onCancel]
  );

  React.useLayoutEffect(() => {
    if (!isOpen) return;

    void pageControls.start({
      opacity: [0, 1],
      x: [visibleSnapshot.canGoBack ? 18 : -18, 0],
      transition: DRAWER_TRANSITION,
    });
  }, [
    isOpen,
    pageControls,
    visibleSnapshot.activeKey,
    visibleSnapshot.canGoBack,
  ]);

  const handleAnimationEnd = React.useCallback((open: boolean) => {
    if (!open && !isOpenRef.current) {
      setClosingSnapshot({
        title: '',
        activeKey: '',
        canGoBack: false,
        doneLabel: '完成',
        doneActions: undefined,
        doneDisabled: false,
        children: null,
      });
    }
  }, []);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      onAnimationEnd={handleAnimationEnd}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-60 bg-black/50" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-61 mx-auto flex max-h-[88vh] max-w-md flex-col overflow-hidden rounded-t-3xl bg-neutral-50 outline-none dark:bg-neutral-900"
          aria-describedby={undefined}
        >
          <div className="relative min-h-0 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-linear-to-b from-neutral-50 via-neutral-50 via-75% to-transparent pt-5 pb-8 dark:from-neutral-900 dark:via-neutral-900">
              <div className="pointer-events-auto grid grid-cols-[minmax(76px,1fr)_auto_minmax(76px,1fr)] items-center px-6">
                <button
                  type="button"
                  onClick={canGoBack ? onBack : onCancel}
                  className="w-fit cursor-pointer rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-600 transition active:scale-95 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {visibleSnapshot.canGoBack
                    ? visibleSnapshot.backLabel || '返回'
                    : '取消'}
                </button>
                <Drawer.Title className="max-w-48 truncate px-3 text-center text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {visibleSnapshot.title}
                </Drawer.Title>
                {visibleSnapshot.doneActions?.length ? (
                  <div className="ml-auto flex w-fit overflow-hidden rounded-full bg-neutral-100 text-sm font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                    {visibleSnapshot.doneActions.map((action, index) => (
                      <React.Fragment key={`${action.label}-${index}`}>
                        {index > 0 && (
                          <div className="my-2 w-px shrink-0 bg-neutral-300 dark:bg-neutral-700" />
                        )}
                        <button
                          type="button"
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className="cursor-pointer px-4 py-2 transition active:scale-95 disabled:cursor-default disabled:opacity-30 disabled:active:scale-100"
                        >
                          {action.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onDone}
                    disabled={visibleSnapshot.doneDisabled}
                    className="ml-auto w-fit cursor-pointer rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 transition active:scale-95 disabled:cursor-default disabled:opacity-30 disabled:active:scale-100 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {visibleSnapshot.doneLabel}
                  </button>
                )}
              </div>
            </div>

            <motion.div
              initial={false}
              animate={pageControls}
              transition={DRAWER_TRANSITION}
              className="max-h-[88vh] min-h-0 overflow-y-auto pt-[76px]"
              style={{
                scrollPaddingTop: '76px',
                scrollPaddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
              }}
            >
              <div
                style={{
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                }}
              >
                {visibleSnapshot.children}
              </div>
            </motion.div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default PageStackDrawer;
