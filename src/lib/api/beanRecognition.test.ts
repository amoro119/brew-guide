import { describe, expect, it } from 'vitest';
import { normalizeRecognizedBeanPayload } from './beanRecognition';

describe('normalizeRecognizedBeanPayload', () => {
  it('deduplicates variety-only blend components', () => {
    const payload = normalizeRecognizedBeanPayload({
      name: '2026 瑰夏村 金标 Oma 157',
      blendComponents: [
        { origin: '瑰夏村', process: '水洗', variety: 'Oma 157' },
        { variety: 'Oma 157 Oma 157' },
      ],
    });

    expect(payload).toEqual({
      name: '2026 瑰夏村 金标 Oma 157',
      blendComponents: [
        { origin: '瑰夏村', process: '水洗', variety: 'Oma 157' },
      ],
    });
  });

  it('prefers a named variety over a short batch number', () => {
    const payload = normalizeRecognizedBeanPayload({
      name: '2026 瑰夏村 金标 Oma 157',
      blendComponents: [{ origin: '瑰夏村', process: '水洗', variety: '1931' }],
    });

    expect(payload).toEqual({
      name: '2026 瑰夏村 金标 Oma 157',
      blendComponents: [
        { origin: '瑰夏村', process: '水洗', variety: 'Oma 157' },
      ],
    });
  });
});
