import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoffeeBean } from '@/types/app';
import { FlavorPeriodStatus } from '@/lib/utils/beanVarietyUtils';
import {
  buildBeanListRecords,
  createBeanInventorySnapshot,
  searchBeanRecords,
  type BeanInventorySnapshotOptions,
} from './beanListPipeline';

const baseOptions: BeanInventorySnapshotOptions = {
  filterMode: 'flavorPeriod',
  selectedVariety: null,
  selectedOrigin: null,
  selectedProcessingMethod: null,
  selectedFlavorPeriod: null,
  selectedRoaster: null,
  selectedBeanGroupId: null,
  selectedBeanType: 'all',
  selectedBeanState: 'roasted',
  showEmptyBeans: true,
};

const buildBean = (bean: Partial<CoffeeBean>): CoffeeBean => ({
  id: 'bean',
  timestamp: 1,
  name: 'Test Bean',
  roastDate: '2026-06-01',
  startDay: 7,
  endDay: 60,
  capacity: '100',
  remaining: '50',
  beanState: 'roasted',
  ...bean,
});

const createSnapshot = (
  beans: CoffeeBean[],
  options: Partial<BeanInventorySnapshotOptions> = {}
) =>
  createBeanInventorySnapshot(buildBeanListRecords(beans), {
    ...baseOptions,
    ...options,
  });

describe('beanListPipeline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps empty beans out of flavor period categories', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00'));

    const availableOptimal = buildBean({
      id: 'available-optimal',
      remaining: '25',
    });
    const emptyOptimal = buildBean({
      id: 'empty-optimal',
      remaining: '0',
    });
    const emptyFrozen = buildBean({
      id: 'empty-frozen',
      remaining: '0',
      isFrozen: true,
    });

    const allSnapshot = createSnapshot([
      availableOptimal,
      emptyOptimal,
      emptyFrozen,
    ]);
    expect(allSnapshot.availableFlavorPeriods).toEqual([
      FlavorPeriodStatus.OPTIMAL,
    ]);
    expect(allSnapshot.emptyBeans.map(bean => bean.id)).toEqual([
      'empty-optimal',
      'empty-frozen',
    ]);

    const optimalSnapshot = createSnapshot(
      [availableOptimal, emptyOptimal, emptyFrozen],
      { selectedFlavorPeriod: FlavorPeriodStatus.OPTIMAL }
    );
    expect(optimalSnapshot.filteredBeans.map(bean => bean.id)).toEqual([
      'available-optimal',
    ]);
    expect(optimalSnapshot.emptyBeans).toEqual([]);
  });

  it('can search all categories without widening bean type', () => {
    const currentCategoryBean = buildBean({
      id: 'current-filter',
      name: 'Current Filter Bean',
      beanType: 'filter',
      blendComponents: [{ variety: 'Typica' }],
    });
    const matchingFilterBean = buildBean({
      id: 'matching-filter',
      name: '121 Filter Bean',
      beanType: 'filter',
      blendComponents: [{ variety: 'Bourbon' }],
    });
    const matchingEspressoBean = buildBean({
      id: 'matching-espresso',
      name: '121 Espresso Bean',
      beanType: 'espresso',
      blendComponents: [{ variety: 'Bourbon' }],
    });
    const beans = [
      currentCategoryBean,
      matchingFilterBean,
      matchingEspressoBean,
    ];

    const currentCategorySnapshot = createSnapshot(beans, {
      filterMode: 'variety',
      selectedVariety: 'Typica',
      selectedBeanType: 'filter',
    });
    expect(
      searchBeanRecords(currentCategorySnapshot.filteredRecords, '121')
    ).toEqual([]);

    const allCategorySnapshot = createSnapshot(beans, {
      filterMode: 'variety',
      selectedVariety: null,
      selectedBeanType: 'filter',
    });
    expect(
      searchBeanRecords(allCategorySnapshot.filteredRecords, '121').map(
        record => record.bean.id
      )
    ).toEqual(['matching-filter']);
  });
});
