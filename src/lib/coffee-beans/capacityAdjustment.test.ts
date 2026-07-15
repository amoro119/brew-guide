import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addNote: vi.fn(),
  increaseBeanRemaining: vi.fn(),
  updateBeanRemaining: vi.fn(),
}));

vi.mock('@/lib/stores/brewingNoteStore', () => ({
  useBrewingNoteStore: {
    getState: () => ({ addNote: mocks.addNote }),
  },
}));

vi.mock('@/lib/stores/coffeeBeanStore', () => ({
  increaseBeanRemaining: mocks.increaseBeanRemaining,
  updateBeanRemaining: mocks.updateBeanRemaining,
}));

import {
  applyCapacityAdjustmentDelta,
  getCapacityChangeUpdates,
  revertCapacityAdjustmentRecord,
} from './capacityAdjustment';

describe('capacity change remaining sync', () => {
  it.each([
    ['integer', '250', '250', '300', true, '300'],
    ['decimal', '250.5', '250.5', '300.5', true, '300.5'],
    ['equivalent formatting', '250', '250.0', '300', true, '300'],
    ['consumed inventory', '250', '200', '300', true, '200'],
    ['empty amounts', '', '', '300', true, '300'],
    ['roasting conversion', '250', '', '300', false, ''],
  ])('handles %s', (_label, capacity, remaining, next, sync, expected) => {
    expect(getCapacityChangeUpdates(capacity, remaining, next, sync)).toEqual({
      capacity: next,
      remaining: expected,
    });
  });
});

describe('capacity adjustment inventory sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.increaseBeanRemaining.mockResolvedValue(null);
    mocks.updateBeanRemaining.mockResolvedValue(null);
  });

  it('applies positive and negative deltas through the shared inventory helpers', async () => {
    await applyCapacityAdjustmentDelta('bean-1', 5);
    await applyCapacityAdjustmentDelta('bean-1', -3);

    expect(mocks.increaseBeanRemaining).toHaveBeenCalledWith('bean-1', 5);
    expect(mocks.updateBeanRemaining).toHaveBeenCalledWith('bean-1', 3);
  });

  it('reverts a capacity adjustment by applying the opposite delta', async () => {
    await revertCapacityAdjustmentRecord({
      beanId: 'bean-1',
      changeRecord: {
        capacityAdjustment: {
          originalAmount: 10,
          newAmount: 14,
          changeAmount: 4,
          changeType: 'increase',
        },
      },
    });

    expect(mocks.updateBeanRemaining).toHaveBeenCalledWith('bean-1', 4);
  });
});
