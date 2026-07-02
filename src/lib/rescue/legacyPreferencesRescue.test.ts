import { afterEach, describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  collectLegacyPreferencesSnapshot,
  exportLegacyPreferencesRescueData,
} from './legacyPreferencesRescue';

const { preferencesStore, preferencesMock } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    preferencesStore: store,
    preferencesMock: {
      keys: vi.fn(async () => ({ keys: Array.from(store.keys()) })),
      get: vi.fn(async ({ key }: { key: string }) => ({
        value: store.get(key) ?? null,
      })),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  };
});

vi.mock('@capacitor/preferences', () => ({
  Preferences: preferencesMock,
}));

describe('legacy Preferences rescue export', () => {
  afterEach(() => {
    preferencesStore.clear();
    vi.clearAllMocks();
  });

  it('reads known legacy data keys without writing or deleting Preferences', async () => {
    preferencesStore.set('coffeeBeans', '[{"id":"bean-1"}]');
    preferencesStore.set('brewingNotes', '[{"id":"note-1"}]');
    preferencesStore.set('customMethods_v60', '[{"id":"method-1"}]');
    preferencesStore.set('brew-guide:crash-diagnostics:current-session', '{}');

    const snapshot = await collectLegacyPreferencesSnapshot();

    expect(snapshot.matchedKeys).toEqual([
      'brewingNotes',
      'coffeeBeans',
      'customMethods_v60',
    ]);
    expect(snapshot.entries.coffeeBeans.rawValue).toBe('[{"id":"bean-1"}]');
    expect(snapshot.entries.coffeeBeans.parsedSummary).toEqual({
      status: 'parsed',
      type: 'array',
      itemCount: 1,
    });
    expect(snapshot.entries.customMethods_v60.rawValue).toBe(
      '[{"id":"method-1"}]'
    );
    expect(Preferences.get).toHaveBeenCalledWith({ key: 'coffeeBeans' });
    expect(Preferences.get).toHaveBeenCalledWith({ key: 'brewingNotes' });
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(Preferences.remove).not.toHaveBeenCalled();
    expect(Preferences.clear).not.toHaveBeenCalled();
  });

  it('exports an empty legacyPreferences section when no legacy keys exist', async () => {
    preferencesStore.set('brew-guide:crash-diagnostics:current-session', '{}');

    const jsonData = await exportLegacyPreferencesRescueData();
    const parsed = JSON.parse(jsonData) as {
      data: {
        legacyPreferences: {
          matchedKeys: string[];
          entries: Record<string, unknown>;
        };
      };
    };

    expect(parsed.data.legacyPreferences.matchedKeys).toEqual([]);
    expect(parsed.data.legacyPreferences.entries).toEqual({});
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(Preferences.remove).not.toHaveBeenCalled();
    expect(Preferences.clear).not.toHaveBeenCalled();
  });
});
