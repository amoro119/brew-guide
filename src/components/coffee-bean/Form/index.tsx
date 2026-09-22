'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Camera, Images } from 'lucide-react';
import { ExtendedCoffeeBean, BlendComponent } from './types';
import BasicInfo from './components/BasicInfo';
import DetailInfo from './components/DetailInfo';
import FlavorInfo from './components/FlavorInfo';
import NotesInfo from './components/NotesInfo';
import {
  autofillBlendComponentsFromName,
  useBlendComponentSuggestions,
} from './hooks/useBlendComponentSuggestions';
import {
  addCustomPreset,
  DEFAULT_ORIGINS,
  DEFAULT_ESTATES,
  DEFAULT_PROCESSES,
  DEFAULT_VARIETIES,
  type BlendPresetKey,
} from './constants';
import { defaultSettings } from '@/components/settings/Settings';
import {
  ImageProcessingError,
  processImageFile,
} from '@/lib/images/imageProcessing';
import {
  getDefaultFlavorPeriodByRoastLevelSync,
  normalizeFlavorPeriodDay,
} from '@/lib/utils/flavorPeriodUtils';
import { modalHistory } from '@/lib/hooks/useModalHistory';
import { inferBeanType } from '@/lib/utils/beanTypeInference';
import { useRoasterLogo, useSettingsStore } from '@/lib/stores/settingsStore';
import {
  getBeanRoasterName,
  getCoffeeBeanRoasterSuggestions,
  prepareCoffeeBeanRoasterFieldsForFormDraft,
  prepareCoffeeBeanRoasterFieldsForSave,
  normalizeDelimitedTextList,
  updateBlendComponentsDelimitedField,
} from '@/lib/utils/coffeeBeanUtils';
import { useCoffeeBeanStore } from '@/lib/stores/coffeeBeanStore';
import { getCapacityChangeUpdates } from '@/lib/coffee-beans/capacityAdjustment';
import {
  getEnabledBeanFieldIds,
  resolveBeanFieldConfig,
} from '@/lib/coffee-beans/beanFields';
import { captureImage } from '@/lib/utils/imageCapture';

type ImageSourceTarget = 'front' | 'back';
export type CoffeeBeanDrawerPage = 'form' | 'image-source';

interface CoffeeBeanFormProps {
  onSave: (bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>) => void;
  onValidityChange?: (canSave: boolean) => void;
  initialBean?: ExtendedCoffeeBean;
  isRepurchasing?: boolean;
  onRepurchase?: () => void;
  /** 初始豆子状态（生豆/熟豆），用于新建时自动设置 */
  initialBeanState?: 'green' | 'roasted';
  /** 当前是否处于“生豆转熟豆”烘焙流程（来源生豆ID） */
  roastingSourceBeanId?: string | null;
  /** 识别时使用的原始图片 base64（用于在表单中显示） */
  recognitionImage?: string | null;
  activeDrawerPage?: CoffeeBeanDrawerPage;
  imageSourceTarget?: ImageSourceTarget;
  onOpenImageSourcePage?: (target: ImageSourceTarget) => void;
  onCloseImageSourcePage?: () => void;
}

// 暴露给父组件的方法
export interface CoffeeBeanFormHandle {
  done: () => void;
}

const getTodayLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isRoastingDraft = (
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>,
  roastingSourceBeanId?: string | null
) => {
  return (
    !!roastingSourceBeanId &&
    bean.beanState === 'roasted' &&
    bean.sourceGreenBeanId === roastingSourceBeanId
  );
};

const isValidBeanType = (beanType: ExtendedCoffeeBean['beanType']) => {
  return (
    beanType === 'filter' || beanType === 'espresso' || beanType === 'omni'
  );
};

const isBeanReadyToSave = (
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
) => {
  return (
    typeof bean.name === 'string' &&
    bean.name.trim() !== '' &&
    isValidBeanType(bean.beanType)
  );
};

const createEmptyBeanDraft = (
  initialBeanState?: 'green' | 'roasted'
): Omit<ExtendedCoffeeBean, 'id' | 'timestamp'> => ({
  name: '',
  capacity: '',
  remaining: '',
  roastLevel: '',
  roastDate: '',
  flavor: [],
  price: '',
  beanType: 'filter',
  notes: '',
  startDay: undefined,
  endDay: undefined,
  blendComponents: [],
  beanState: initialBeanState || 'roasted',
  purchaseDate:
    initialBeanState === 'green' ? getTodayLocalDateString() : undefined,
});

const createInitialBeanDraft = ({
  initialBean,
  initialBeanState,
  roastingSourceBeanId,
  roasterFieldEnabled,
}: {
  initialBean?: ExtendedCoffeeBean;
  initialBeanState?: 'green' | 'roasted';
  roastingSourceBeanId?: string | null;
  roasterFieldEnabled: boolean;
}): Omit<ExtendedCoffeeBean, 'id' | 'timestamp'> => {
  if (!initialBean) {
    return createEmptyBeanDraft(initialBeanState);
  }

  const { id: _id, timestamp: _timestamp, ...beanData } = initialBean;
  const preparedBeanData = prepareCoffeeBeanRoasterFieldsForFormDraft(
    beanData,
    { roasterFieldEnabled }
  );

  if (!preparedBeanData.beanType) {
    preparedBeanData.beanType = 'filter';
  }

  if (isRoastingDraft(preparedBeanData, roastingSourceBeanId)) {
    preparedBeanData.roastLevel = '';
    preparedBeanData.startDay = undefined;
    preparedBeanData.endDay = undefined;
  }

  return preparedBeanData;
};

const getFlavorPeriodForBeanDraft = (
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>,
  roastLevelOverride?: string
) => {
  const currentRoastLevel = roastLevelOverride || bean.roastLevel || '';

  try {
    const currentSettings = useSettingsStore.getState().settings;
    const customFlavorPeriod =
      currentSettings.customFlavorPeriod || defaultSettings.customFlavorPeriod;
    const roasterName = getBeanRoasterName(bean) || undefined;

    return getDefaultFlavorPeriodByRoastLevelSync(
      currentRoastLevel,
      customFlavorPeriod,
      roasterName
    );
  } catch (error) {
    console.error('获取自定义赏味期设置失败，使用默认值:', error);
    return getDefaultFlavorPeriodByRoastLevelSync(currentRoastLevel);
  }
};

const CoffeeBeanForm = forwardRef<CoffeeBeanFormHandle, CoffeeBeanFormProps>(
  (
    {
      onSave,
      onValidityChange,
      initialBean,
      isRepurchasing = false,
      onRepurchase,
      initialBeanState,
      roastingSourceBeanId,
      recognitionImage,
      activeDrawerPage = 'form',
      imageSourceTarget = 'front',
      onOpenImageSourcePage,
      onCloseImageSourcePage,
    },
    ref
  ) => {
    // 添加一个状态来跟踪正在编辑的剩余容量输入
    const [editingRemaining, setEditingRemaining] = useState<string | null>(
      null
    );

    // 添加拼配成分状态
    const [blendComponents, setBlendComponents] = useState<BlendComponent[]>(
      () => {
        if (
          initialBean &&
          initialBean.blendComponents &&
          initialBean.blendComponents.length > 0
        ) {
          return initialBean.blendComponents;
        }

        // 如果没有拼配成分，创建一个空的成分用于单品豆
        // （移除了旧的 origin/process/variety 字段兼容性代码）

        // 默认创建一个空成分
        return [
          {
            origin: '',
            country: '',
            region: '',
            estate: '',
            processingStation: '',
            altitude: '',
            process: '',
            batch: '',
            variety: '',
          },
        ];
      }
    );
    const blendComponentNameAutofillRef = useRef<BlendComponent[]>([]);

    const [bean, setBean] = useState<
      Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
    >(() => {
      const currentSettings = useSettingsStore.getState().settings;
      const draft = createInitialBeanDraft({
        initialBean,
        initialBeanState,
        roastingSourceBeanId,
        roasterFieldEnabled: !!currentSettings.roasterFieldEnabled,
      });

      if (
        recognitionImage &&
        currentSettings.autoFillRecognitionImage &&
        !draft.image
      ) {
        return { ...draft, image: recognitionImage };
      }

      return draft;
    });

    // 获取设置和所有咖啡豆用于烘焙商建议
    const settings = useSettingsStore(state => state.settings);
    const enabledBlendComponentFields = getEnabledBeanFieldIds(
      resolveBeanFieldConfig(settings)
    );
    const allBeans = useCoffeeBeanStore(state => state.beans);

    const roasterSuggestions = React.useMemo(() => {
      return getCoffeeBeanRoasterSuggestions(
        allBeans,
        !!settings.roasterFieldEnabled
      );
    }, [allBeans, settings.roasterFieldEnabled]);
    const blendComponentSuggestions = useBlendComponentSuggestions();

    const roasterLogoName = React.useMemo(() => {
      // 根据是否启用独立烘焙商字段决定如何获取烘焙商名称
      // 启用独立输入时：只从 roaster 字段获取
      // 关闭独立输入时：从名称中提取
      return getBeanRoasterName(bean) || null;
    }, [bean.name, bean.roaster]);

    // 烘焙商图标仅用于显示，不存储到咖啡豆数据
    const roasterLogo = useRoasterLogo(roasterLogoName);

    // 验证剩余容量，确保不超过总容量（失焦时再次验证）
    const validateRemaining = useCallback(() => {
      setEditingRemaining(null);

      if (bean.capacity && bean.remaining) {
        const capacityNum = parseFloat(bean.capacity);
        const remainingNum = parseFloat(bean.remaining);

        if (
          !isNaN(capacityNum) &&
          !isNaN(remainingNum) &&
          remainingNum > capacityNum
        ) {
          setBean(prev => ({
            ...prev,
            remaining: bean.capacity,
          }));
        }
      }
    }, [bean.capacity, bean.remaining]);

    // 处理总量失焦时的同步逻辑（现在主要逻辑在BasicInfo组件中处理）
    const handleCapacityBlur = useCallback(() => {
      // 预留给其他可能的失焦处理逻辑
    }, []);

    // 处理容量变化并智能推断咖啡豆类型
    // 只在新建模式下自动推断，编辑模式保持用户原有选择
    const handleCapacityChangeForTypeInference = useCallback(
      (capacity: string) => {
        // 只在新建模式下进行自动推断
        if (initialBean) return;

        // 如果用户已选择全能，不再自动推断
        if (bean.beanType === 'omni') return;

        const type = inferBeanType(capacity);
        if (type) {
          setBean(prev => ({ ...prev, beanType: type }));
        }
      },
      [initialBean, bean.beanType]
    );

    // 添加风味标签
    const handleAddFlavor = (flavorValue: string) => {
      const nextFlavors = normalizeDelimitedTextList(flavorValue);
      if (nextFlavors.length === 0) return;

      setBean(prev => ({
        ...prev,
        flavor: Array.from(new Set([...(prev.flavor || []), ...nextFlavors])),
      }));
    };

    // 移除风味标签
    const handleRemoveFlavor = (flavor: string) => {
      setBean(prev => ({
        ...prev,
        flavor: prev.flavor?.filter((f: string) => f !== flavor) || [],
      }));
    };

    const handleUpdateFlavor = (index: number, flavorValue: string) => {
      const nextFlavors = normalizeDelimitedTextList(flavorValue);

      setBean(prev => {
        const flavors = [...(prev.flavor || [])];
        flavors.splice(index, 1, ...nextFlavors);
        return { ...prev, flavor: Array.from(new Set(flavors)) };
      });
    };

    // 根据烘焙度自动设置赏味期参数
    const autoSetFlavorPeriod = useCallback(
      (roastLevelOverride?: string) => {
        const { startDay, endDay } = getFlavorPeriodForBeanDraft(
          bean,
          roastLevelOverride
        );

        setBean(prev => ({
          ...prev,
          startDay: startDay || undefined,
          endDay: endDay || undefined,
          isFrozen: false,
        }));
      },
      [bean]
    );

    // 处理输入变化
    const handleInputChange =
      (field: keyof Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>) =>
      (value: string) => {
        const safeValue = String(value || '');

        if (field === 'startDay' || field === 'endDay') {
          const day = normalizeFlavorPeriodDay(safeValue);

          setBean(prev => ({
            ...prev,
            [field]: day || undefined,
          }));
        } else if (field === 'capacity') {
          // 修改正则表达式以允许小数点
          const numericValue = safeValue.replace(/[^0-9.]/g, '');

          // 确保只有一个小数点
          const dotCount = (numericValue.match(/\./g) || []).length;
          let sanitizedValue =
            dotCount > 1
              ? numericValue.substring(0, numericValue.lastIndexOf('.'))
              : numericValue;

          // 限制小数点后只能有一位数字
          const dotIndex = sanitizedValue.indexOf('.');
          if (dotIndex !== -1 && dotIndex < sanitizedValue.length - 2) {
            sanitizedValue = sanitizedValue.substring(0, dotIndex + 2);
          }

          setBean(prev => ({
            ...prev,
            ...getCapacityChangeUpdates(
              prev.capacity,
              prev.remaining,
              sanitizedValue,
              !isRoastingDraft(prev, roastingSourceBeanId)
            ),
          }));
          setEditingRemaining(null);
        } else if (field === 'remaining') {
          // 修改正则表达式以允许小数点
          const numericValue = safeValue.replace(/[^0-9.]/g, '');

          // 确保只有一个小数点
          const dotCount = (numericValue.match(/\./g) || []).length;
          let sanitizedValue =
            dotCount > 1
              ? numericValue.substring(0, numericValue.lastIndexOf('.'))
              : numericValue;

          // 限制小数点后只能有一位数字
          const dotIndex = sanitizedValue.indexOf('.');
          if (dotIndex !== -1 && dotIndex < sanitizedValue.length - 2) {
            sanitizedValue = sanitizedValue.substring(0, dotIndex + 2);
          }

          setEditingRemaining(sanitizedValue);

          if (bean.capacity && sanitizedValue.trim() !== '') {
            const capacityNum = parseFloat(bean.capacity);
            const remainingNum = parseFloat(sanitizedValue);

            if (!isNaN(capacityNum) && !isNaN(remainingNum)) {
              if (remainingNum > capacityNum) {
                setEditingRemaining(bean.capacity);
                setBean(prev => ({
                  ...prev,
                  remaining: prev.capacity,
                }));
                return;
              }
            }
          }

          setBean(prev => ({
            ...prev,
            remaining: sanitizedValue,
          }));
        } else if (field === 'roastLevel') {
          setBean(prev => ({
            ...prev,
            [field]: safeValue,
          }));

          if (safeValue) {
            autoSetFlavorPeriod(safeValue);
          }
        } else if (field === 'name') {
          // 更新名称
          setBean(prev => ({
            ...prev,
            [field]: safeValue,
          }));

          setBlendComponents(prev => {
            const autofillResult = autofillBlendComponentsFromName(
              prev,
              safeValue,
              blendComponentSuggestions,
              blendComponentNameAutofillRef.current,
              enabledBlendComponentFields
            );

            blendComponentNameAutofillRef.current =
              autofillResult.autofillComponents;

            return autofillResult.components;
          });
        } else {
          setBean(prev => ({
            ...prev,
            [field]: safeValue,
          }));
        }
      };

    const handleBlendComponentChange = (
      index: number,
      field: Exclude<keyof BlendComponent, 'percentage'>,
      value: string
    ) => {
      setBlendComponents(prev =>
        updateBlendComponentsDelimitedField(prev, index, field, value)
      );
    };

    // 提交表单
    const handleSubmit = async () => {
      validateRemaining();

      if (!isBeanReadyToSave(bean)) {
        return;
      }

      const addPresetValues = (
        key: BlendPresetKey,
        defaultValues: string[],
        value?: string
      ) => {
        normalizeDelimitedTextList(value).forEach(item => {
          if (!defaultValues.includes(item)) {
            addCustomPreset(key, item);
          }
        });
      };

      // 保存自定义的预设值
      blendComponents.forEach(component => {
        addPresetValues('origins', DEFAULT_ORIGINS, component.origin);
        addPresetValues('countries', [], component.country);
        addPresetValues('regions', [], component.region);
        addPresetValues('estates', DEFAULT_ESTATES, component.estate);
        addPresetValues('processingStations', [], component.processingStation);
        addPresetValues('altitudes', [], component.altitude);
        addPresetValues('processes', DEFAULT_PROCESSES, component.process);
        addPresetValues('batches', [], component.batch);
        addPresetValues('varieties', DEFAULT_VARIETIES, component.variety);
      });

      if (bean.roaster?.trim()) {
        addCustomPreset('roasters', bean.roaster);
      }

      if (bean.roastLevel?.trim()) {
        addCustomPreset('roastLevels', bean.roastLevel);
      }

      bean.flavor?.forEach(flavor => {
        addCustomPreset('flavors', flavor);
      });

      // 先清理历史栈（关闭所有 bean-form 相关的历史记录）
      modalHistory.closeAllByPrefix('bean-form');

      // 准备保存的数据
      const finalBean = prepareCoffeeBeanRoasterFieldsForSave(
        { ...bean, blendComponents },
        { roasterFieldEnabled: settings.roasterFieldEnabled }
      );

      // 调用保存回调
      onSave(finalBean);
    };

    useImperativeHandle(ref, () => ({
      done: () => {
        void handleSubmit();
      },
    }));

    const canSave = isBeanReadyToSave(bean);

    useEffect(() => {
      onValidityChange?.(canSave);
    }, [canSave, onValidityChange]);

    // 切换冷冻状态
    const toggleFrozenState = () => {
      setBean(prev => ({
        ...prev,
        isFrozen: !prev.isFrozen,
      }));
    };

    // 切换在途状态
    const toggleInTransitState = () => {
      setBean(prev => {
        const nextIsInTransit = !prev.isInTransit;

        if (!nextIsInTransit) {
          return {
            ...prev,
            isInTransit: false,
          };
        }

        const shouldFillFlavorPeriod =
          !!prev.roastLevel?.trim() && !prev.startDay && !prev.endDay;
        const flavorPeriod = shouldFillFlavorPeriod
          ? getFlavorPeriodForBeanDraft(prev)
          : null;

        return {
          ...prev,
          isInTransit: true,
          roastDate: '',
          startDay: flavorPeriod
            ? flavorPeriod.startDay || undefined
            : prev.startDay,
          endDay: flavorPeriod ? flavorPeriod.endDay || undefined : prev.endDay,
          isFrozen: false,
        };
      });
    };

    // 处理图片上传
    const handleImageUpload = async (file: File) => {
      try {
        const image = await processImageFile(file, {
          compression: {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 1200,
            initialQuality: 0.8,
          },
        });
        setBean(prev => ({ ...prev, image }));
      } catch (error) {
        alert(
          error instanceof ImageProcessingError
            ? error.message
            : '图片处理失败，请更换图片后重试'
        );
      }
    };

    // 处理背面图片上传
    const handleBackImageUpload = async (file: File) => {
      try {
        const backImage = await processImageFile(file, {
          compression: {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 1200,
            initialQuality: 0.8,
          },
        });
        setBean(prev => ({ ...prev, backImage }));
      } catch (error) {
        alert(
          error instanceof ImageProcessingError
            ? error.message
            : '背面图片处理失败，请更换图片后重试'
        );
      }
    };

    const handleImageSourceSelect = async (source: 'camera' | 'gallery') => {
      try {
        const result = await captureImage({ source });
        const response = await fetch(result.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `image.${result.format}`, {
          type: `image/${result.format}`,
        });

        if (imageSourceTarget === 'back') {
          await handleBackImageUpload(file);
        } else {
          await handleImageUpload(file);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('打开相机/相册失败:', error);
        }
      } finally {
        onCloseImageSourcePage?.();
      }
    };

    if (activeDrawerPage === 'image-source') {
      return (
        <div className="px-6 pb-5">
          <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => void handleImageSourceSelect('camera')}
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium text-neutral-800 transition active:bg-black/5 dark:text-neutral-100 dark:active:bg-white/5"
            >
              <Camera
                className="size-5 text-neutral-500 dark:text-neutral-400"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              拍照
            </button>
            <div className="ml-12 h-px bg-neutral-200 dark:bg-neutral-700" />
            <button
              type="button"
              onClick={() => void handleImageSourceSelect('gallery')}
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium text-neutral-800 transition active:bg-black/5 dark:text-neutral-100 dark:active:bg-white/5"
            >
              <Images
                className="size-5 text-neutral-500 dark:text-neutral-400"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              相册
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="pt-1">
        <BasicInfo
          bean={bean}
          onBeanChange={handleInputChange}
          editingRemaining={editingRemaining}
          validateRemaining={validateRemaining}
          handleCapacityBlur={handleCapacityBlur}
          toggleInTransitState={toggleInTransitState}
          isEdit={!!initialBean}
          isRepurchasing={isRepurchasing}
          onRepurchase={onRepurchase}
          recognitionImage={recognitionImage}
          onCapacityChange={handleCapacityChangeForTypeInference}
          roasterLogo={roasterLogo}
          roasterFieldEnabled={settings.roasterFieldEnabled}
          roasterSuggestions={roasterSuggestions}
          roastingSourceBeanId={roastingSourceBeanId}
          onOpenImageSourcePage={onOpenImageSourcePage}
        />

        <DetailInfo
          bean={bean}
          onBeanChange={handleInputChange}
          blendComponents={blendComponents}
          onBlendComponentsChange={{
            change: handleBlendComponentChange,
          }}
          autoSetFlavorPeriod={autoSetFlavorPeriod}
          toggleFrozenState={toggleFrozenState}
        />

        <FlavorInfo
          bean={bean}
          onAddFlavor={handleAddFlavor}
          onRemoveFlavor={handleRemoveFlavor}
          onUpdateFlavor={handleUpdateFlavor}
        />

        <NotesInfo bean={bean} onBeanChange={handleInputChange} />
      </div>
    );
  }
);

CoffeeBeanForm.displayName = 'CoffeeBeanForm';

export default CoffeeBeanForm;
