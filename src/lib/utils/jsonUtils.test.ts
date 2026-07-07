import { describe, expect, it } from 'vitest';
import { extractJsonFromText } from './jsonUtils';
import type { CoffeeBean } from '@/types/app';

describe('coffee bean readable text import', () => {
  it('parses structured origin and batch fields from readable text', () => {
    const bean = extractJsonFromText(`【咖啡豆信息】奇拉卡
烘焙商: Alo
成分信息:
产国: 埃塞俄比亚
产区: 西达摩
庄园: 博纳
海拔: 2100m
处理法: 水洗
批次: A12
品种: 74158`) as Partial<CoffeeBean>;

    expect(bean.blendComponents).toEqual([
      {
        percentage: 100,
        origin: '',
        country: '埃塞俄比亚',
        region: '西达摩',
        estate: '博纳',
        altitude: '2100m',
        process: '水洗',
        batch: 'A12',
        variety: '74158',
      },
    ]);
  });
});
