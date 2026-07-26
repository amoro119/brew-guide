/**
 * 跨器具方案复制
 *
 * 把某个器具的方案复制到另一个器具时，注水方式可能在目标器具上不存在
 * （例如自定义注水动画只属于原器具），这里统一做兼容处理。
 */

import {
  type CustomEquipment,
  type Method,
  type Stage,
} from '@/lib/core/config';
import {
  getDefaultPourType,
  isEspressoMachine,
  isPourTypeAvailable,
} from '@/lib/utils/equipmentUtils';

/**
 * 判断方案是否为意式方案
 * 意式方案与手冲方案的步骤结构不通用，不能互相复制
 */
const isEspressoMethod = (
  method: Method,
  equipment?: CustomEquipment
): boolean => {
  if (equipment && isEspressoMachine(equipment)) return true;

  return (method.params.stages || []).some(
    stage => stage.pourType === 'extraction' || stage.pourType === 'beverage'
  );
};

/**
 * 判断方案能否复制到目标器具
 */
export const canTransferMethod = (
  method: Method,
  sourceEquipment: CustomEquipment,
  targetEquipment: CustomEquipment
): boolean =>
  isEspressoMethod(method, sourceEquipment) ===
  isEspressoMachine(targetEquipment);

/**
 * 把来源器具的注水方式映射到目标器具
 * 优先级：目标器具已支持 > 同名注水动画 > 自定义动画对应的基础注水方式 > 目标器具默认注水方式
 */
const resolvePourType = (
  pourType: string | undefined,
  sourceEquipment: CustomEquipment,
  targetEquipment: CustomEquipment
): string | undefined => {
  if (!pourType) return pourType;
  if (isPourTypeAvailable(targetEquipment, pourType)) return pourType;

  const sourceAnimation = sourceEquipment.customPourAnimations?.find(
    animation => animation.id === pourType
  );

  if (sourceAnimation) {
    const matchedAnimation = targetEquipment.customPourAnimations?.find(
      animation => animation.name === sourceAnimation.name
    );

    if (
      matchedAnimation &&
      isPourTypeAvailable(targetEquipment, matchedAnimation.id)
    ) {
      return matchedAnimation.id;
    }

    if (
      matchedAnimation?.pourType &&
      isPourTypeAvailable(targetEquipment, matchedAnimation.pourType)
    ) {
      return matchedAnimation.pourType;
    }

    if (
      sourceAnimation.pourType &&
      isPourTypeAvailable(targetEquipment, sourceAnimation.pourType)
    ) {
      return sourceAnimation.pourType;
    }
  }

  return getDefaultPourType(targetEquipment);
};

const transferStage = (
  stage: Stage,
  sourceEquipment: CustomEquipment,
  targetEquipment: CustomEquipment
): Stage => {
  const nextStage: Stage = {
    ...stage,
    pourType: resolvePourType(stage.pourType, sourceEquipment, targetEquipment),
  };

  // 目标器具没有阀门时，去掉阀门状态
  if (!targetEquipment.hasValve) {
    delete nextStage.valveStatus;
  }

  return nextStage;
};

/**
 * 生成可添加到目标器具的方案副本
 * 不保留原方案 ID，由调用方生成新的 ID
 */
export const transferMethodToEquipment = (
  method: Method,
  sourceEquipment: CustomEquipment,
  targetEquipment: CustomEquipment
): Method => ({
  name: method.name,
  params: {
    ...method.params,
    stages: (method.params.stages || []).map(stage =>
      transferStage(stage, sourceEquipment, targetEquipment)
    ),
  },
});
