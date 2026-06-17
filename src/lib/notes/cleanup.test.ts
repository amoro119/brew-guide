import { describe, expect, it } from 'vitest';
import type { BrewingNote } from '@/lib/core/config';
import { normalizeBrewingNote } from './cleanup';

describe('normalizeBrewingNote', () => {
  it('fills missing taste ratings from CLI-created notes', () => {
    const note = {
      id: 'note-cli',
      timestamp: 1781665593757,
      method: '挂耳包',
      rating: 4.4,
      notes: 'CLI 写入的记录',
    } as BrewingNote;

    const normalized = normalizeBrewingNote(note);

    expect(normalized.changed).toBe(true);
    expect(normalized.note.taste).toEqual({});
  });

  it('removes legacy embedded coffee bean snapshots', () => {
    const note = {
      id: 'note-legacy',
      timestamp: 1,
      rating: 0,
      taste: {},
      notes: '',
      coffeeBean: { name: 'legacy' },
    } as BrewingNote & { coffeeBean: unknown };

    const normalized = normalizeBrewingNote(note);

    expect(normalized.changed).toBe(true);
    expect('coffeeBean' in normalized.note).toBe(false);
  });
});
