import { describe, expect, it, vi } from 'vitest';

import { blurBeanDetailEditorOnEscape } from './utils';

describe('bean detail Escape handling', () => {
  it('blurs the focused editor on the first Escape keydown', () => {
    const blur = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const target = {
      closest: vi.fn(() => ({ blur })),
    };

    blurBeanDetailEditorOnEscape({
      key: 'Escape',
      defaultPrevented: false,
      target,
      preventDefault,
      stopPropagation,
    } as unknown as Parameters<typeof blurBeanDetailEditorOnEscape>[0]);

    expect(blur).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it('leaves Escape owned by a nested popup alone', () => {
    const closest = vi.fn();

    blurBeanDetailEditorOnEscape({
      key: 'Escape',
      defaultPrevented: true,
      target: { closest },
    } as unknown as Parameters<typeof blurBeanDetailEditorOnEscape>[0]);

    expect(closest).not.toHaveBeenCalled();
  });
});
