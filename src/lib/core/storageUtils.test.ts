import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exportBeans: vi.fn(),
  exportNotes: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(),
  },
}));
vi.mock('./db', () => ({
  db: { settings: { get: vi.fn(), put: vi.fn() } },
  dbUtils: { initialize: vi.fn(), clearAllData: vi.fn() },
}));
vi.mock('@/lib/utils/coffeeBeanUtils', () => ({
  normalizeCoffeeBeans: (beans: unknown) => beans,
}));
vi.mock('@/lib/coffee-beans/imageRepository', () => ({
  exportCoffeeBeansWithImages: mocks.exportBeans,
}));
vi.mock('@/lib/notes/imageRepository', () => ({
  exportBrewingNotesWithImages: mocks.exportNotes,
}));

import { StorageUtils } from './storageUtils';

describe('StorageUtils IndexedDB reads', () => {
  beforeEach(() => {
    mocks.exportBeans.mockReset();
    mocks.exportNotes.mockReset();
  });

  it('propagates a coffee bean read failure instead of returning an empty list', async () => {
    const error = new Error('IndexedDB unavailable');
    mocks.exportBeans.mockRejectedValue(error);

    await expect(StorageUtils.getData('coffeeBeans')).rejects.toBe(error);
  });

  it('still serializes a genuinely empty coffee bean collection as an empty list', async () => {
    mocks.exportBeans.mockResolvedValue([]);

    await expect(StorageUtils.getData('coffeeBeans')).resolves.toBe('[]');
  });

  it('propagates a brewing note read failure instead of returning an empty list', async () => {
    const error = new Error('Notes store unavailable');
    mocks.exportNotes.mockRejectedValue(error);

    await expect(StorageUtils.getData('brewingNotes')).rejects.toBe(error);
  });
});
