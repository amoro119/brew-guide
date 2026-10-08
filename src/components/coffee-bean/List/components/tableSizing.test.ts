import { expect, it } from 'vitest';
import { getKeyboardColumnSize, parseColumnSizing } from './tableSizing';

it('restores only valid known column widths and applies sizing bounds', () => {
  expect(parseColumnSizing(null)).toEqual({});
  expect(parseColumnSizing('[]')).toEqual({});
  expect(parseColumnSizing('42')).toEqual({});
  expect(
    parseColumnSizing(
      JSON.stringify({
        name: 500,
        roaster: 1,
        notes: 9999,
        price: -5,
        capacity: '100',
        removed: 100,
      })
    )
  ).toEqual({ name: 500, roaster: 100, notes: 1600 });
});

it('supports bounded fine/coarse keyboard adjustment and boundary shortcuts', () => {
  expect(getKeyboardColumnSize('ArrowLeft', 105, 100, 1600)).toBe(100);
  expect(getKeyboardColumnSize('ArrowRight', 1595, 100, 1600)).toBe(1600);
  expect(getKeyboardColumnSize('ArrowRight', 200, 100, 1600, true)).toBe(250);
  expect(getKeyboardColumnSize('Home', 200, 100, 1600)).toBe(100);
  expect(getKeyboardColumnSize('End', 200, 100, 1600)).toBe(1600);
  expect(getKeyboardColumnSize('Tab', 200, 100, 1600)).toBeUndefined();
});
