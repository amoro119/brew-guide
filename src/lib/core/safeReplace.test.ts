import { describe, expect, it } from 'vitest';
import { shouldSkipDestructiveReplace } from './safeReplace';

describe('shouldSkipDestructiveReplace', () => {
  it('blocks empty replacements when local records still exist', () => {
    expect(
      shouldSkipDestructiveReplace({ nextCount: 0, existingCount: 12 })
    ).toBe(true);
  });

  it('allows explicit empty replacements', () => {
    expect(
      shouldSkipDestructiveReplace({
        nextCount: 0,
        existingCount: 12,
        allowEmptyReplace: true,
      })
    ).toBe(false);
  });

  it('blocks non-empty destructive shrink replacements', () => {
    expect(
      shouldSkipDestructiveReplace({ nextCount: 3, existingCount: 12 })
    ).toBe(true);
  });

  it('allows explicit destructive replacements', () => {
    expect(
      shouldSkipDestructiveReplace({
        nextCount: 3,
        existingCount: 12,
        allowDestructiveReplace: true,
      })
    ).toBe(false);
  });

  it('allows same-size replacements, growth, and empty no-ops', () => {
    expect(
      shouldSkipDestructiveReplace({ nextCount: 12, existingCount: 12 })
    ).toBe(false);
    expect(
      shouldSkipDestructiveReplace({ nextCount: 13, existingCount: 12 })
    ).toBe(false);
    expect(
      shouldSkipDestructiveReplace({ nextCount: 0, existingCount: 0 })
    ).toBe(false);
  });
});
