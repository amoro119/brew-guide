import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import TableView from './TableView';

const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  refs: [] as Array<{ current: unknown }>,
  setState: vi.fn(),
}));

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) =>
      hooks.effects.push(effect),
    useRef: (initial: unknown) => {
      const ref = actual.useRef(initial);
      hooks.refs.push(ref);
      return ref;
    },
    useState: (initial: unknown) => [
      actual.useState(initial)[0],
      hooks.setState,
    ],
  };
});

vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ settings: {} }),
  getRoasterLogoFromConfigs: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  hooks.effects.length = 0;
  hooks.refs.length = 0;
  hooks.setState.mockClear();
});

it('dismisses previews on blur or hidden pages and cancels pending work', () => {
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), { hidden: false });
  const clearTimeout = vi.fn();
  vi.stubGlobal(
    'window',
    Object.assign(windowTarget, {
      clearTimeout,
      matchMedia: () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }),
    })
  );
  vi.stubGlobal('document', documentTarget);

  renderToStaticMarkup(
    <TableView filteredBeans={[]} emptyBeans={[]} showEmptyBeans={false} />
  );
  const cleanups = hooks.effects.map(effect => effect());
  const requestId = hooks.refs.find(ref => ref.current === 0)!;
  const pendingTimeout = hooks.refs.find(ref => ref.current === null)!;
  hooks.setState.mockClear();

  pendingTimeout.current = 123;
  windowTarget.dispatchEvent(new Event('blur'));
  expect(hooks.setState).toHaveBeenLastCalledWith(null);
  expect(requestId.current).toBe(1);
  expect(clearTimeout).toHaveBeenCalledWith(123);
  expect(pendingTimeout.current).toBeNull();

  hooks.setState.mockClear();
  documentTarget.dispatchEvent(new Event('visibilitychange'));
  expect(hooks.setState).not.toHaveBeenCalled();
  documentTarget.hidden = true;
  documentTarget.dispatchEvent(new Event('visibilitychange'));
  expect(hooks.setState).toHaveBeenLastCalledWith(null);
  expect(requestId.current).toBe(2);

  pendingTimeout.current = 456;
  cleanups.forEach(cleanup => cleanup?.());
  expect(clearTimeout).toHaveBeenCalledWith(456);
  expect(requestId.current).toBe(3);
  hooks.setState.mockClear();
  windowTarget.dispatchEvent(new Event('blur'));
  documentTarget.dispatchEvent(new Event('visibilitychange'));
  expect(hooks.setState).not.toHaveBeenCalled();
});
