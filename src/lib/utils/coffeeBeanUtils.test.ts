import { describe, expect, it } from 'vitest';
import { prepareCoffeeBeanRoasterFieldsForFormDraft } from './coffeeBeanUtils';

describe('prepareCoffeeBeanRoasterFieldsForFormDraft', () => {
  it('保留与烘焙商同名的续购咖啡豆名称', () => {
    expect(
      prepareCoffeeBeanRoasterFieldsForFormDraft(
        { roaster: '111', name: '111 #2' },
        { roasterFieldEnabled: true }
      )
    ).toEqual({ roaster: '111', name: '111 #2' });
  });

  it('仍会移除旧版组合名称中的重复烘焙商前缀', () => {
    expect(
      prepareCoffeeBeanRoasterFieldsForFormDraft(
        { roaster: '111', name: '111 Ethiopia' },
        { roasterFieldEnabled: true }
      )
    ).toEqual({ roaster: '111', name: 'Ethiopia' });
  });
});
