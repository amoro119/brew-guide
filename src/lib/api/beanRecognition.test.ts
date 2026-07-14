import { describe, expect, it } from 'vitest';
import {
  buildBeanRecognitionPrompt,
  normalizeRecognizedBeanPayload,
} from './beanRecognition';

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

  it('applies field settings after recognition normalization', () => {
    const payload = normalizeRecognizedBeanPayload(
      {
        name: '博纳 水洗',
        blendComponents: [
          {
            origin: '埃塞俄比亚',
            estate: '博纳',
            processingStation: '沃卡',
            process: '水洗',
            altitude: '2100m',
            batch: 'A12',
          },
        ],
      },
      {
        beanFieldConfig: {
          version: 1,
          fields: [
            { id: 'origin', enabled: true, order: 0 },
            { id: 'process', enabled: true, order: 1 },
          ],
        },
      }
    );

    expect(payload).toEqual({
      name: '博纳 水洗',
      blendComponents: [{ origin: '埃塞俄比亚', process: '水洗' }],
      notes: '庄园：博纳 / 处理站：沃卡 / 海拔：2100m / 批次：A12',
    });
  });

  it('adds final prompt constraints for configured bean fields', () => {
    const prompt = buildBeanRecognitionPrompt('base prompt', {
      beanFieldConfig: {
        version: 1,
        fields: [
          { id: 'country', enabled: true, order: 0 },
          { id: 'region', enabled: true, order: 1 },
          { id: 'processingStation', enabled: true, order: 2 },
          { id: 'process', enabled: true, order: 3 },
        ],
      },
    });

    expect(prompt).toContain('base prompt');
    expect(prompt).toContain(
      '只允许输出这些成分字段：country/region/processingStation/process'
    );
    expect(prompt).toContain('origin 是未结构化的“产地概括”');
    expect(prompt).toContain('processingStation 仅表示处理站/水洗站');
    expect(prompt).toContain('严禁输出未允许的 blendComponents 键');
  });
});
