import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addNote: vi.fn(),
  addBean: vi.fn(),
  getBeanById: vi.fn(),
  updateBean: vi.fn(),
  increaseBeanRemaining: vi.fn(),
  updateBeanRemaining: vi.fn(),
}));

vi.mock('@/lib/stores/brewingNoteStore', () => ({
  useBrewingNoteStore: {
    getState: () => ({ addNote: mocks.addNote }),
  },
}));

vi.mock('@/lib/stores/coffeeBeanStore', () => ({
  getCoffeeBeanStore: () => ({
    addBean: mocks.addBean,
    getBeanById: mocks.getBeanById,
    updateBean: mocks.updateBean,
  }),
  increaseBeanRemaining: mocks.increaseBeanRemaining,
  updateBeanRemaining: mocks.updateBeanRemaining,
}));

import {
  addBeanWithInitialCapacityAdjustmentRecord,
  applyCapacityAdjustmentDelta,
  getCapacityChangeUpdates,
  revertCapacityAdjustmentRecord,
  updateBeanWithCapacityAdjustmentRecord,
} from './capacityAdjustment';

const bean = {
  id: 'bean-1',
  timestamp: 1,
  name: 'Test bean',
  capacity: '250',
  remaining: '200',
} as const;

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

  it('records the initial difference when a bean is added', async () => {
    mocks.addBean.mockResolvedValue(bean);
    mocks.addNote.mockResolvedValue({ id: 'note-1' });

    await addBeanWithInitialCapacityAdjustmentRecord({
      name: bean.name,
      capacity: bean.capacity,
      remaining: bean.remaining,
    });

    expect(mocks.addNote).toHaveBeenCalledWith(
      expect.objectContaining({
        beanId: bean.id,
        source: 'capacity-adjustment',
        changeRecord: {
          capacityAdjustment: {
            originalAmount: 250,
            newAmount: 200,
            changeAmount: -50,
            changeType: 'decrease',
          },
        },
      })
    );
  });

  it('updates the bean before recording a remaining change', async () => {
    mocks.addNote.mockResolvedValue({ id: 'note-1' });
    mocks.getBeanById.mockReturnValue(bean);
    mocks.updateBean.mockResolvedValue({ ...bean, remaining: '180' });

    await updateBeanWithCapacityAdjustmentRecord(bean.id, {
      remaining: '180',
    });

    expect(mocks.updateBean).toHaveBeenCalledWith(bean.id, {
      remaining: '180',
    });
    expect(mocks.addNote).toHaveBeenCalled();
  });

  it('does not record an unchanged remaining amount', async () => {
    mocks.addBean.mockResolvedValue({ ...bean, remaining: bean.capacity });
    mocks.getBeanById.mockReturnValue(bean);
    mocks.updateBean.mockResolvedValue(bean);

    await addBeanWithInitialCapacityAdjustmentRecord({
      name: bean.name,
      capacity: bean.capacity,
      remaining: bean.capacity,
    });
    await updateBeanWithCapacityAdjustmentRecord(bean.id, { name: 'Renamed' });

    expect(mocks.addNote).not.toHaveBeenCalled();
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
