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

const bean = {
  id: 'bean-1',
  name: '测试咖啡豆',
  timestamp: 1,
  capacity: '200',
  remaining: '100',
};

it('uses one fixed sizing source and renders handles only between visible columns', () => {
  const markup = renderToStaticMarkup(
    <TableView
      filteredBeans={[bean]}
      emptyBeans={[]}
      showEmptyBeans={false}
      visibleColumns={['roaster', 'name', 'notes']}
    />
  );
  expect(markup).toContain('table-fixed');
  expect(markup).toContain('style="width:525px"');
  expect(markup).toContain(
    '<colgroup><col style="width:125px"/><col style="width:200px"/><col style="width:200px"/></colgroup>'
  );
  expect(markup.match(/role="separator"/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="调整烘焙商宽度"');
  expect(markup).not.toContain('aria-label="调整备注宽度"');
  expect(markup).not.toContain('max-w-[200px]');
});

it('omits the handle when a single column is visible and exposes keyboard capacity actions', () => {
  const markup = renderToStaticMarkup(
    <TableView
      filteredBeans={[bean]}
      emptyBeans={[]}
      showEmptyBeans={false}
      visibleColumns={['capacity']}
      onRemainingClick={() => {}}
    />
  );
  expect(markup).not.toContain('role="separator"');
  expect(markup).toContain('aria-label="调整 测试咖啡豆 的剩余容量"');
  expect(markup).toContain('scope="col"');
});

it('restores widths by column id after visibility changes', () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      key.includes('tableColumnSizing')
        ? JSON.stringify({ name: 500, roaster: 180, notes: 300 })
        : null,
  });
  const markup = renderToStaticMarkup(
    <TableView
      filteredBeans={[bean]}
      emptyBeans={[]}
      showEmptyBeans={false}
      visibleColumns={['name', 'notes']}
    />
  );
  expect(markup).toContain('style="width:800px"');
  expect(markup).toContain(
    '<colgroup><col style="width:500px"/><col style="width:300px"/></colgroup>'
  );
  expect(markup.match(/role="separator"/g)).toHaveLength(1);
});

it('exposes primary sorting and secondary priority while keeping empty beans last', () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      key.includes('tableSorting')
        ? JSON.stringify([
            { id: 'name', desc: true },
            { id: 'capacity', desc: false },
          ])
        : null,
  });
  const markup = renderToStaticMarkup(
    <TableView
      filteredBeans={[{ ...bean, name: 'Z-full' }]}
      emptyBeans={[{ ...bean, id: 'empty', name: 'A-empty', remaining: '0' }]}
      showEmptyBeans
      visibleColumns={['name', 'capacity']}
    />
  );
  expect(markup.match(/aria-sort=/g)).toHaveLength(1);
  expect(markup).toContain('aria-sort="descending"');
  expect(markup).toContain('容量，升序，排序优先级 2');
  expect(markup.indexOf('Z-full')).toBeLessThan(markup.indexOf('A-empty'));
});

it('ignores stale sorting on hidden columns and invalid stored widths', () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      key.includes('tableSorting')
        ? JSON.stringify([{ id: 'roaster', desc: true }])
        : '{invalid',
  });
  const markup = renderToStaticMarkup(
    <TableView
      filteredBeans={[bean]}
      emptyBeans={[]}
      showEmptyBeans={false}
      visibleColumns={['name']}
    />
  );
  expect(markup).not.toContain('aria-sort=');
  expect(markup).toContain('style="width:200px"');
});
