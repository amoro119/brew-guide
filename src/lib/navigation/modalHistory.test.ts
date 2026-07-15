import { afterEach, describe, expect, it, vi } from 'vitest';

import { modalHistory, type ModalCloseSource } from './modalHistory';
import {
  getChildPageStyle,
  getParentPageStyle,
  shouldMoveParentPage,
  skipNextPageExitTransition,
} from './pageTransition';

function installWindow({ reduceMotion = false } = {}) {
  const listeners = new Map<string, Set<EventListener>>();

  const dispatchPopState = (state: unknown = null) => {
    const event = { state } as PopStateEvent;
    listeners.get('popstate')?.forEach(listener => listener(event));
  };

  vi.stubGlobal('window', {
    innerWidth: 390,
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      go: vi.fn(),
      back: vi.fn(() => dispatchPopState()),
    },
    matchMedia: vi.fn((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMotion : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const typeListeners = listeners.get(type) ?? new Set<EventListener>();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
  });

  return { dispatchPopState };
}

afterEach(() => {
  modalHistory.destroy();
  vi.unstubAllGlobals();
});

describe('parent page transition policy', () => {
  it('moves the parent while heavy content detail is still pending', () => {
    expect(
      shouldMoveParentPage({
        isLargeScreen: false,
        hasOverlayModalOpen: false,
        hasContentDetailOpen: false,
        isContentDetailPending: true,
      })
    ).toBe(true);
  });

  it('keeps the parent transition for lightweight overlay pages', () => {
    expect(
      shouldMoveParentPage({
        isLargeScreen: true,
        hasOverlayModalOpen: true,
        hasContentDetailOpen: false,
      })
    ).toBe(true);
  });

  it('keeps content detail stationary in the desktop split layout', () => {
    expect(
      shouldMoveParentPage({
        isLargeScreen: true,
        hasOverlayModalOpen: false,
        hasContentDetailOpen: true,
      })
    ).toBe(false);
  });
});

describe('modalHistory navigation source', () => {
  it('marks in-app back as app initiated', () => {
    installWindow();
    let source: ModalCloseSource | null = null;

    modalHistory.register({
      id: 'detail',
      onClose: event => {
        source = event.source;
      },
    });

    modalHistory.back();

    expect(source).toBe('app');
  });

  it('marks external popstate as history initiated', () => {
    const { dispatchPopState } = installWindow();
    let source: ModalCloseSource | null = null;

    modalHistory.register({
      id: 'detail',
      onClose: event => {
        source = event.source;
      },
    });

    dispatchPopState();

    expect(source).toBe('history');
  });
});

describe('bean detail history lifecycle', () => {
  it('keeps one layer across responsive handoff and pushes again when reopened', () => {
    installWindow();
    const mobileClose = vi.fn();
    const desktopClose = vi.fn();
    const mobileEntry = { id: 'bean-detail', onClose: mobileClose };
    const desktopEntry = { id: 'bean-detail', onClose: desktopClose };

    modalHistory.register(mobileEntry);
    modalHistory.register(desktopEntry);
    modalHistory.close('bean-detail', true, mobileEntry);

    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(window.history.go).not.toHaveBeenCalled();
    expect(modalHistory.getStackIds()).toEqual(['bean-detail']);

    modalHistory.back();

    expect(desktopClose).toHaveBeenCalledTimes(1);
    expect(mobileClose).not.toHaveBeenCalled();

    const reopenedClose = vi.fn();
    modalHistory.register({ id: 'bean-detail', onClose: reopenedClose });
    modalHistory.back();

    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    expect(window.history.back).toHaveBeenCalledTimes(2);
    expect(reopenedClose).toHaveBeenCalledTimes(1);
    expect(modalHistory.getStackIds()).toEqual([]);
  });

  it('returns from edit to detail before closing the detail', () => {
    installWindow();
    const detailClose = vi.fn();
    const editClose = vi.fn();

    modalHistory.register({ id: 'bean-detail', onClose: detailClose });
    modalHistory.register({ id: 'bean-detail-edit', onClose: editClose });

    modalHistory.back();

    expect(editClose).toHaveBeenCalledTimes(1);
    expect(detailClose).not.toHaveBeenCalled();
    expect(modalHistory.getStackIds()).toEqual(['bean-detail']);

    modalHistory.back();

    expect(detailClose).toHaveBeenCalledTimes(1);
    expect(modalHistory.getStackIds()).toEqual([]);
  });
});

describe('page transition skip', () => {
  it('skips one child and parent exit transition', () => {
    installWindow();

    skipNextPageExitTransition();

    expect(getChildPageStyle(false).transition).toBe('none');
    expect(getParentPageStyle(false).transition).toBe('none');
    expect(getChildPageStyle(false).transition).not.toBe('none');
  });

  it('keeps parent skip until the parent is restoring', () => {
    installWindow();

    skipNextPageExitTransition();

    expect(getParentPageStyle(true).transition).not.toBe('none');
    expect(getParentPageStyle(false).transition).toBe('none');
  });

  it('drops movement for reduced motion users', () => {
    installWindow({ reduceMotion: true });

    expect(getChildPageStyle(false).transform).toBe('translate3d(0, 0, 0)');
    expect(getChildPageStyle(false).transition).toContain('opacity 200ms');
    expect(getParentPageStyle(true).transform).toBe('translateX(0) scale(1)');
  });
});
