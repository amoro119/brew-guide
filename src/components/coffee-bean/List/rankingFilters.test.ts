import { describe, expect, it } from 'vitest';
import type { CoffeeBean } from '@/types/app';
import {
  formatRankingDateLabel,
  getRankingDateKey,
  getRankingDates,
  getRankingRoasters,
  matchesRankingFilter,
} from './rankingFilters';

const buildBean = (overrides: Partial<CoffeeBean>): CoffeeBean => ({
  id: 'bean',
  timestamp: 0,
  name: 'TestBean',
  ...overrides,
});

describe('ranking filters', () => {
  it('groups roast dates at the selected granularity', () => {
    const bean = buildBean({ roastDate: '2026年9月2日' });

    expect(getRankingDateKey(bean, 'year')).toBe('2026');
    expect(getRankingDateKey(bean, 'month')).toBe('2026-09');
    expect(getRankingDateKey(bean, 'day')).toBe('2026-09-02');
    expect(
      getRankingDateKey(buildBean({ roastDate: '2026-02-31' }), 'day')
    ).toBeNull();
  });

  it('builds sorted date and roaster categories without empty values', () => {
    const beans = [
      buildBean({ id: 'a', roastDate: '2025-02-03', roaster: 'B' }),
      buildBean({ id: 'b', roastDate: '2026-01-01', roaster: 'A' }),
      buildBean({ id: 'd', roastDate: '2026-01-02', roaster: 'B' }),
      buildBean({ id: 'c' }),
    ];

    expect(getRankingDates(beans, 'month')).toEqual(['2026-01', '2025-02']);
    expect(getRankingRoasters(beans)).toEqual(['B', 'A']);
  });

  it('combines bean type with the active ranking category', () => {
    const bean = buildBean({
      beanType: 'filter',
      roastDate: '2026-09-02',
      roaster: 'Sample Roaster',
    });

    expect(
      matchesRankingFilter(bean, {
        filterMode: 'date',
        beanType: 'filter',
        dateGroupingMode: 'month',
        selectedDate: '2026-09',
        selectedRoaster: 'Other Roaster',
      })
    ).toBe(true);
    expect(
      matchesRankingFilter(bean, {
        filterMode: 'date',
        beanType: 'espresso',
        dateGroupingMode: 'month',
        selectedDate: '2026-09',
        selectedRoaster: 'Sample Roaster',
      })
    ).toBe(false);
    expect(
      matchesRankingFilter(bean, {
        filterMode: 'roaster',
        beanType: 'filter',
        dateGroupingMode: 'month',
        selectedDate: null,
        selectedRoaster: 'Sample Roaster',
      })
    ).toBe(true);
  });

  it('formats recent dates consistently with the notes filter', () => {
    const now = new Date(2026, 8, 2, 12);

    expect(formatRankingDateLabel('2026', 'year', now)).toBe('今年');
    expect(formatRankingDateLabel('2026-09', 'month', now)).toBe('本月');
    expect(formatRankingDateLabel('2026-09-01', 'day', now)).toBe('昨天');
  });
});
