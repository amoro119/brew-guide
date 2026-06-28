import { describe, expect, it } from 'vitest';
import type { BrewingNote } from '@/lib/core/config';
import { SORT_OPTIONS } from './types';
import { filterSearchableNotes, sortNotes } from './utils';

const createNote = (
  id: string,
  timestamp: number,
  rating = 0
): BrewingNote => ({
  id,
  timestamp,
  rating,
  taste: {},
  notes: '',
});

describe('note list utilities', () => {
  it('sorts notes by newest timestamp first', () => {
    const notes = [
      createNote('2025-note', Date.UTC(2025, 5, 1)),
      createNote('2026-note', Date.UTC(2026, 0, 1)),
      createNote('2024-note', Date.UTC(2024, 11, 31)),
    ];

    expect(
      sortNotes(notes, SORT_OPTIONS.TIME_DESC).map(note => note.id)
    ).toEqual(['2026-note', '2025-note', '2024-note']);
  });

  it('keeps the current sort order when filtering search matches', () => {
    const sortedNotes = [
      createNote('2026-note', Date.UTC(2026, 0, 1)),
      createNote('2025-note', Date.UTC(2025, 5, 1)),
    ];

    const matches = filterSearchableNotes(
      [
        {
          note: sortedNotes[0],
          searchableTexts: [{ text: 'notes mention 74158 once', weight: 1 }],
        },
        {
          note: sortedNotes[1],
          searchableTexts: [
            { text: '74158', weight: 3 },
            { text: '74158 exact high score', weight: 3 },
          ],
        },
      ],
      '74158'
    );

    expect(matches.map(note => note.id)).toEqual(['2026-note', '2025-note']);
  });
});
