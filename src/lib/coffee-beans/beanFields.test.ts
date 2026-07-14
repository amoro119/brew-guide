import { describe, expect, it } from 'vitest';
import {
  getComponentOriginDisplay,
  normalizeCoffeeBeanForFieldConfig,
  resolveBeanFieldConfig,
  type BeanFieldId,
} from './beanFields';
import type { CoffeeBean } from '@/types/app';
import type { AppSettings } from '@/lib/core/db';

const buildBean = (bean: Partial<CoffeeBean>): CoffeeBean => ({
  id: 'bean',
  timestamp: 1,
  name: 'Test Bean',
  ...bean,
});

const settingsWithEnabledFields = (
  enabledIds: BeanFieldId[]
): Pick<AppSettings, 'beanFieldConfig'> => ({
  beanFieldConfig: {
    version: 1,
    fields: enabledIds.map((id, index) => ({
      id,
      enabled: true,
      order: index,
    })),
  },
});

describe('bean field configuration', () => {
  it('keeps legacy origin/process/variety as the default compatible fields', () => {
    const config = resolveBeanFieldConfig();
    expect(
      config.fields.filter(field => field.enabled).map(field => field.id)
    ).toEqual(['origin', 'process', 'variety']);
    expect(
      config.fields.find(field => field.id === 'processingStation')
    ).toEqual({
      id: 'processingStation',
      enabled: false,
      order: 4,
    });
  });

  it('inherits the legacy estate toggle when no explicit config exists', () => {
    const config = resolveBeanFieldConfig({ showEstateField: true });
    expect(
      config.fields.filter(field => field.enabled).map(field => field.id)
    ).toEqual(['origin', 'estate', 'process', 'variety']);
  });

  it('moves disabled component fields into notes during import normalization', () => {
    const normalized = normalizeCoffeeBeanForFieldConfig(
      buildBean({
        blendComponents: [
          {
            origin: '埃塞俄比亚',
            estate: '博纳',
            processingStation: '沃卡',
            process: '水洗',
            variety: '74158',
            altitude: '2100m',
            batch: '1931',
          },
        ],
      }),
      settingsWithEnabledFields(['origin', 'process', 'variety'])
    );

    expect(normalized.blendComponents).toEqual([
      {
        origin: '埃塞俄比亚',
        process: '水洗',
        variety: '74158',
      },
    ]);
    expect(normalized.notes).toBe(
      '庄园：博纳 / 处理站：沃卡 / 海拔：2100m / 批次：1931'
    );
  });

  it('keeps estate structured when the user enables it', () => {
    const normalized = normalizeCoffeeBeanForFieldConfig(
      buildBean({
        blendComponents: [
          {
            origin: '埃塞俄比亚',
            estate: '博纳',
            process: '水洗',
          },
        ],
      }),
      settingsWithEnabledFields(['origin', 'estate', 'process'])
    );

    expect(normalized.blendComponents).toEqual([
      {
        origin: '埃塞俄比亚',
        estate: '博纳',
        process: '水洗',
      },
    ]);
    expect(normalized.notes).toBeUndefined();
  });

  it('keeps processing station structured only when explicitly enabled', () => {
    const normalized = normalizeCoffeeBeanForFieldConfig(
      buildBean({
        blendComponents: [
          {
            country: '埃塞俄比亚',
            estate: '博纳',
            processingStation: '沃卡',
            process: '水洗',
          },
        ],
      }),
      settingsWithEnabledFields([
        'country',
        'estate',
        'processingStation',
        'process',
      ])
    );

    expect(normalized.blendComponents).toEqual([
      {
        country: '埃塞俄比亚',
        estate: '博纳',
        processingStation: '沃卡',
        process: '水洗',
      },
    ]);
    expect(normalized.notes).toBeUndefined();
  });

  it('uses structured origin fields before legacy origin for display', () => {
    expect(
      getComponentOriginDisplay({
        origin: '埃塞俄比亚 西达摩 博纳',
        country: '埃塞俄比亚',
        region: '西达摩',
        estate: '博纳',
        processingStation: '沃卡',
      })
    ).toBe('埃塞俄比亚 · 西达摩 · 博纳 · 沃卡');
  });

  it('falls back to legacy origin when no structured origin fields exist', () => {
    expect(getComponentOriginDisplay({ origin: '埃塞俄比亚 西达摩' })).toBe(
      '埃塞俄比亚 西达摩'
    );
  });
});
