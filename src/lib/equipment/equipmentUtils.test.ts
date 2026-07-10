import { describe, expect, it } from 'vitest';
import { equipmentList } from '@/lib/core/config';
import { equipmentUtils } from './equipmentUtils';

describe('equipmentUtils.getAllEquipments', () => {
  it('keeps the saved visible order when an unlisted equipment is hidden', () => {
    const enabledEquipmentIds = equipmentList
      .filter(equipment => equipment.defaultEnabled !== false)
      .map(equipment => equipment.id);
    const [hiddenEquipmentId, ...visibleEquipmentIds] = enabledEquipmentIds;
    const savedVisibleOrder = [...visibleEquipmentIds].reverse();

    const visibleCategoryOrder = equipmentUtils
      .getAllEquipments([], { equipmentIds: savedVisibleOrder })
      .filter(equipment => equipment.id !== hiddenEquipmentId)
      .map(equipment => equipment.id);

    expect(visibleCategoryOrder).toEqual(savedVisibleOrder);
  });
});
