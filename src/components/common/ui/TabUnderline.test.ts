import { expect, it } from 'vitest';
import { getTabUnderlinePosition } from './tabUnderlinePosition';

it('positions the underline in the full row, outside the scrolling clip', () => {
  const row = { left: 24, right: 340, top: 100 };
  expect(
    getTabUnderlinePosition({ left: 24, right: 48, top: 122 }, row)
  ).toEqual({ left: 0, top: 22, width: 24 });
  const viewport = { left: 90, right: 300, top: 100 };
  expect(
    getTabUnderlinePosition({ left: 100, right: 140, top: 122 }, row, viewport)
  ).toEqual({ left: 76, top: 22, width: 40 });
  expect(
    getTabUnderlinePosition({ left: 70, right: 110, top: 122 }, row, viewport)
  ).toEqual({ left: 66, top: 22, width: 20 });
  expect(
    getTabUnderlinePosition({ left: 40, right: 60, top: 122 }, row, viewport)
      .width
  ).toBe(0);
});
