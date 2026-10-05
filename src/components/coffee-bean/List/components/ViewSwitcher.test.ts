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
  it('clears the visible flavor period without changing bean type', () => {
    expect(
      getInventoryAllClickAction({
        filterMode: 'flavorPeriod',
        selectedFlavorPeriod: FlavorPeriodStatus.OPTIMAL,
      })
    ).toBe('clear-flavor-period');
  });

  it('keeps bean type when the visible category is already all', () => {
    expect(
      getInventoryAllClickAction({
        filterMode: 'flavorPeriod',
        selectedFlavorPeriod: null,
      })
    ).toBe('none');
  });

  it.each(['espresso', 'filter', 'omni', 'all'] as const)(
    'repeated all clicks never change %s bean type',
    selectedBeanType => {
      const filters = {
        selectedBeanType,
        filterMode: 'roaster' as const,
        selectedRoaster: null,
      };
      expect(getInventoryAllClickAction(filters)).toBe('none');
      expect(getInventoryAllClickAction(filters)).toBe('none');
    }
  );

  it('clears structured origin field filters without changing bean type', () => {
    expect(
      getInventoryAllClickAction({
        filterMode: 'country',
        selectedOrigin: '埃塞俄比亚',
      })
    ).toBe('clear-origin');
  });
});
