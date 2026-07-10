import { describe, expect, it } from 'vitest';
import { getNextDateGroupingMode } from './StatsFilterBar';

describe('getNextDateGroupingMode', () => {
  it('keeps yearly statistics in the grouping cycle', () => {
    expect(getNextDateGroupingMode('day')).toBe('year');
  });
});
