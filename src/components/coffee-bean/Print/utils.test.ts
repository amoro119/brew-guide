import { describe, expect, it } from 'vitest';
import { createInitialContent } from './utils';
import type { CoffeeBean } from '@/types/app';

describe('bean print content', () => {
  it('uses structured origin display before legacy origin', () => {
    const bean: CoffeeBean = {
      id: 'bean',
      timestamp: 1,
      name: '奇拉卡',
      blendComponents: [
        {
          origin: '埃塞俄比亚 西达摩 博纳',
          country: '埃塞俄比亚',
          region: '西达摩',
          estate: '博纳',
          process: '水洗',
        },
      ],
    };

    const content = createInitialContent(bean, {});

    expect(content.origin).toBe('埃塞俄比亚 · 西达摩 · 博纳');
    expect(content.estate).toBe('');
  });
});
