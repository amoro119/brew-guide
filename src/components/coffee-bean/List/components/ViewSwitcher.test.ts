import { describe, expect, it } from 'vitest';
import { FlavorPeriodStatus } from '@/lib/utils/beanVarietyUtils';
import { getInventoryAllClickAction, getNextBeanType } from './ViewSwitcher';

describe('getNextBeanType', () => {
  const availableTypes = ['espresso', 'filter', 'omni'] as const;

  it('cycles through available types and back to all', () => {
    expect(getNextBeanType(availableTypes, 'all')).toBe('espresso');
    expect(getNextBeanType(availableTypes, 'espresso')).toBe('filter');
    expect(getNextBeanType(availableTypes, 'filter')).toBe('omni');
    expect(getNextBeanType(availableTypes, 'omni')).toBe('all');
  });

  it('skips unavailable types', () => {
    expect(getNextBeanType(['filter', 'omni'], 'all')).toBe('filter');
    expect(getNextBeanType(['filter', 'omni'], 'filter')).toBe('omni');
    expect(getNextBeanType([], 'all')).toBeNull();
  });
});

describe('getInventoryAllClickAction', () => {
  it('clears the visible flavor period before widening bean type', () => {
    expect(
      getInventoryAllClickAction({
        selectedBeanType: 'filter',
        filterMode: 'flavorPeriod',
        selectedFlavorPeriod: FlavorPeriodStatus.OPTIMAL,
      })
    ).toBe('clear-flavor-period');
  });

  it('widens bean type when the visible category is already all', () => {
    expect(
      getInventoryAllClickAction({
        selectedBeanType: 'filter',
        filterMode: 'flavorPeriod',
        selectedFlavorPeriod: null,
      })
    ).toBe('clear-bean-type');
  });

  it('clears structured origin field filters before widening bean type', () => {
    expect(
      getInventoryAllClickAction({
        selectedBeanType: 'filter',
        filterMode: 'country',
        selectedOrigin: '埃塞俄比亚',
      })
    ).toBe('clear-origin');
  });
});
