import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  BadgeJapaneseYen,
  Bean,
  CalendarDays,
  ChevronRight,
  Droplets,
  Flame,
  ImagePlus,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import AutocompleteInput from '@/components/common/forms/AutocompleteInput';
import { DatePicker } from '@/components/common/ui/DatePicker';
import SettingSection from '@/components/settings/atomic/SettingSection';
import SettingRow from '@/components/settings/atomic/SettingRow';
import SettingValue from '@/components/settings/atomic/SettingValue';
import SettingValueInput from '@/components/settings/atomic/SettingValueInput';
import {
  getRoastProfileFromAmounts,
  getRoastProfileFromMoistureLoss,
} from '@/lib/utils/roastProfileUtils';
import { ExtendedCoffeeBean } from '../types';
import { usePresetSuggestions } from '../hooks/usePresetSuggestions';
import { useRoastLevelSuggestions } from '../hooks/useCoffeeBeanFieldSuggestions';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface BasicInfoProps {
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>;
  onBeanChange: (
    field: keyof Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
  ) => (value: string) => void;
  editingRemaining: string | null;
  validateRemaining: () => void;
  handleCapacityBlur?: () => void;
  toggleInTransitState: () => void;
  isEdit?: boolean;
  isRepurchasing?: boolean;
  onRepurchase?: () => void;
  /** 识别时使用的原始图片 base64（用于在表单中显示） */
  recognitionImage?: string | null;
  /** 容量变化时的回调，用于触发类型推断 */
  onCapacityChange?: (capacity: string) => void;
  /** 烘焙商图标（自动从烘焙商名称匹配获取） */
  roasterLogo?: string | null;
  /** 是否启用烘焙商字段 */
  roasterFieldEnabled?: boolean;
  /** 烘焙商建议列表 */
  roasterSuggestions?: string[];
  /** 当前是否处于“生豆转熟豆”烘焙流程（来源生豆ID） */
  roastingSourceBeanId?: string | null;
  onOpenImageSourcePage?: (target: 'front' | 'back') => void;
}

// 判断是否为生豆
const isGreenBean = (
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
): boolean => {
  return bean.beanState === 'green';
};

// 判断是否为“生豆转熟豆”的烘焙流程
const isRoastingConversion = (
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>,
  roastingSourceBeanId?: string | null
): boolean => {
  return (
    !!roastingSourceBeanId &&
    bean.beanState === 'roasted' &&
    !!bean.sourceGreenBeanId &&
    bean.sourceGreenBeanId === roastingSourceBeanId
  );
};

const BasicInfo: React.FC<BasicInfoProps> = ({
  bean,
  onBeanChange,
  editingRemaining,
  validateRemaining,
  handleCapacityBlur,
  toggleInTransitState,
  isEdit = false,
  isRepurchasing = false,
  onRepurchase,
  recognitionImage,
  onCapacityChange,
  roasterLogo,
  roasterFieldEnabled = false,
  roasterSuggestions = [],
  roastingSourceBeanId,
  onOpenImageSourcePage,
}) => {
  const [capacityValue, setCapacityValue] = useState('');
  const [remainingValue, setRemainingValue] = useState('');
  const [moistureLoss, setMoistureLoss] = useState('');
  const [isMoistureFocused, setIsMoistureFocused] = useState(false);
  const roasterPresetSuggestions = usePresetSuggestions(
    'roasters',
    roasterSuggestions
  );
  const roastLevelSuggestions = useRoastLevelSuggestions();
  const showBeanFormIcons = useSettingsStore(
    state => state.settings.showBeanFormIcons === true
  );

  const updateRoastLevel = (value: string) => {
    if (bean.roastLevel !== value) {
      onBeanChange('roastLevel')(value);
    }
  };

  const syncRoastProfileFromAmounts = (capacity: string, remaining: string) => {
    const roastProfile = getRoastProfileFromAmounts(capacity, remaining);
    updateRoastLevel(roastProfile.roastLevel);
  };

  const syncRoastProfileFromMoistureLoss = (
    nextMoistureLoss: string,
    capacity: string,
    normalizeDisplay: boolean = false
  ) => {
    const roastProfile = getRoastProfileFromMoistureLoss(
      nextMoistureLoss,
      capacity
    );

    if (normalizeDisplay) {
      setMoistureLoss(
        roastProfile.moistureLoss || nextMoistureLoss.replace(/[^\d.]/g, '')
      );
    }
    updateRoastLevel(roastProfile.roastLevel);

    if (roastProfile.roastedAmount) {
      setRemainingValue(roastProfile.roastedAmount);
      onBeanChange('remaining')(roastProfile.roastedAmount);
    }
  };

  useEffect(() => {
    setCapacityValue(bean.capacity || '');
    setRemainingValue(
      editingRemaining !== null ? editingRemaining : bean.remaining || ''
    );
  }, [bean.capacity, bean.remaining, editingRemaining]);

  const isInRoastingMode = isRoastingConversion(bean, roastingSourceBeanId);
  const derivedMoistureLoss = isInRoastingMode
    ? getRoastProfileFromAmounts(capacityValue, remainingValue).moistureLoss
    : '';
  const displayedMoistureLoss = isMoistureFocused
    ? moistureLoss
    : derivedMoistureLoss;

  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (isGreenBean(bean)) {
      onBeanChange('purchaseDate')(formattedDate);
    } else {
      onBeanChange('roastDate')(formattedDate);
    }
  };

  const parseDisplayDate = (): Date | undefined => {
    const dateStr = isGreenBean(bean) ? bean.purchaseDate : bean.roastDate;
    if (!dateStr) return undefined;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  };

  const getDateLabelAndPlaceholder = () => {
    if (isGreenBean(bean)) {
      return { label: '购买日期', placeholder: '未设置' };
    }
    return { label: '烘焙日期', placeholder: '未设置' };
  };

  const { label: dateLabel, placeholder: datePlaceholder } =
    getDateLabelAndPlaceholder();
  const displayDate = parseDisplayDate();

  const handleCapacityChange = (value: string) => {
    setCapacityValue(value);

    if (isInRoastingMode && remainingValue) {
      syncRoastProfileFromAmounts(value, remainingValue);
    }
  };

  const handleRemainingChange = (value: string) => {
    if (capacityValue && parseFloat(value) > parseFloat(capacityValue)) {
      value = capacityValue;
    }
    setRemainingValue(value);
    onBeanChange('remaining')(value);

    if (isInRoastingMode) {
      syncRoastProfileFromAmounts(capacityValue, value);
    }
  };

  const handleRemainingBlur = () => {
    if (isInRoastingMode) {
      syncRoastProfileFromAmounts(capacityValue, remainingValue);
    }
  };

  const handleMoistureChange = (value: string) => {
    setMoistureLoss(value);

    if (isInRoastingMode) {
      syncRoastProfileFromMoistureLoss(value, capacityValue);
    }
  };

  const handleMoistureBlur = () => {
    setIsMoistureFocused(false);

    if (isInRoastingMode) {
      syncRoastProfileFromMoistureLoss(moistureLoss, capacityValue, true);
    }
  };

  const renderAddSideImageButton = (imageType: 'front' | 'back') => {
    return (
      <button
        type="button"
        onClick={() => onOpenImageSourcePage?.(imageType)}
        className="flex items-center gap-1 text-xs font-medium text-neutral-500 transition active:opacity-60 dark:text-neutral-400"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {imageType === 'back' ? '添加背面图' : '添加正面图'}
      </button>
    );
  };

  const renderStoredImage = (
    source: string,
    alt: string,
    field: 'image' | 'backImage',
    showLabel = false
  ) => (
    <div className="w-[calc(50%_-_0.375rem)]">
      <div className="relative aspect-square">
        <button
          type="button"
          onClick={() =>
            onOpenImageSourcePage?.(field === 'image' ? 'front' : 'back')
          }
          className="relative block size-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800/40"
          aria-label={`更换${alt}`}
        >
          <Image
            src={source}
            alt={alt}
            className="object-cover"
            fill
            sizes="(max-width: 448px) 50vw, 200px"
          />
        </button>
        <button
          type="button"
          onClick={() => onBeanChange(field)('')}
          className="absolute top-0.5 right-0.5 flex size-8 items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition active:scale-90"
          aria-label={`移除${alt}`}
        >
          <X className="size-4" strokeWidth={2.5} />
        </button>
      </div>
      {showLabel && (
        <p className="mt-1.5 text-center text-xs font-medium text-neutral-400">
          {field === 'image' ? '正面图' : '背面图'}
        </p>
      )}
    </div>
  );

  const showImageLabels = Boolean(bean.image && bean.backImage);

  return (
    <>
      <div className="flex flex-col items-center gap-3 px-6 pb-5">
        <div className="flex w-full flex-wrap justify-center gap-3">
          {bean.image ? (
            renderStoredImage(
              bean.image,
              '咖啡豆正面',
              'image',
              showImageLabels
            )
          ) : roasterLogo ? (
            <button
              type="button"
              onClick={() => onOpenImageSourcePage?.('front')}
              className="relative aspect-square w-[calc(50%_-_0.375rem)] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800/40"
              aria-label="添加咖啡豆图片"
            >
              <Image
                src={roasterLogo}
                alt="烘焙商图标"
                className="object-cover opacity-40"
                fill
                sizes="(max-width: 448px) 50vw, 200px"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenImageSourcePage?.('front')}
              className="flex aspect-square w-[calc(50%_-_0.375rem)] items-center justify-center rounded-2xl bg-neutral-100 transition active:scale-[0.98] dark:bg-neutral-800/40"
              aria-label="添加咖啡豆图片"
            >
              <ImagePlus
                className="size-8 text-neutral-400"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
          )}

          {bean.backImage &&
            renderStoredImage(
              bean.backImage,
              '咖啡豆背面',
              'backImage',
              showImageLabels
            )}
        </div>

        {recognitionImage && !bean.image && (
          <button
            type="button"
            onClick={() => onBeanChange('image')(recognitionImage)}
            className="flex max-w-full items-center gap-2 rounded-full bg-neutral-100 py-1.5 pr-3 pl-1.5 text-xs font-medium text-neutral-600 transition active:scale-[0.98] dark:bg-neutral-800 dark:text-neutral-300"
          >
            <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
              <Image
                src={recognitionImage}
                alt="识别图片"
                className="object-cover"
                fill
                sizes="36px"
              />
            </span>
            使用识别图片
          </button>
        )}

        {!bean.backImage &&
          (bean.image || roasterLogo) &&
          renderAddSideImageButton('back')}
      </div>

      <SettingSection compact>
        {roasterFieldEnabled && (
          <SettingRow
            label={isGreenBean(bean) ? '生豆商' : '烘焙商'}
            icon={showBeanFormIcons ? Store : undefined}
          >
            <SettingValue>
              <AutocompleteInput
                value={bean.roaster || ''}
                onChange={onBeanChange('roaster')}
                placeholder="未设置"
                suggestions={roasterPresetSuggestions.suggestions}
                inputMode="text"
                isCustomPreset={roasterPresetSuggestions.isRemovableSuggestion}
                onRemovePreset={roasterPresetSuggestions.removeSuggestion}
                variant="setting"
                containerClassName="min-w-0 flex-1 space-y-0"
              />
            </SettingValue>
          </SettingRow>
        )}
        <SettingRow
          label="咖啡豆名称"
          icon={showBeanFormIcons ? Bean : undefined}
          required
        >
          <SettingValue>
            <AutocompleteInput
              value={bean.name || ''}
              onChange={onBeanChange('name')}
              placeholder={
                roasterFieldEnabled ? '例如：花魁 8.0' : '例如：前街 花魁 8.0'
              }
              suggestions={[]}
              required
              inputMode="text"
              variant="setting"
              onBlur={() => {
                if (!bean.name?.trim()) {
                  onBeanChange('name')('未命名咖啡豆');
                }
              }}
              containerClassName="min-w-0 flex-1 space-y-0"
            />
          </SettingValue>
        </SettingRow>
      </SettingSection>

      <SettingSection compact>
        <SettingRow
          label={isInRoastingMode ? '烘焙量' : '库存量'}
          icon={showBeanFormIcons ? Weight : undefined}
        >
          <SettingValue trailing="g">
            <SettingValueInput
              type="number"
              inputMode="decimal"
              step="0.1"
              value={remainingValue}
              onChange={event => handleRemainingChange(event.target.value)}
              onBlur={() => {
                handleRemainingBlur();
                validateRemaining();
              }}
              placeholder={isInRoastingMode ? '熟豆量' : '剩余量'}
            />
            <span className="shrink-0 text-sm leading-none font-medium text-neutral-400 dark:text-neutral-500">
              /
            </span>
            <SettingValueInput
              type="number"
              inputMode="decimal"
              step="0.1"
              value={capacityValue}
              onChange={event => handleCapacityChange(event.target.value)}
              placeholder={isInRoastingMode ? '生豆量' : '总量'}
              onBlur={() => {
                onBeanChange('capacity')(capacityValue);
                if (isInRoastingMode && remainingValue) {
                  syncRoastProfileFromAmounts(capacityValue, remainingValue);
                }
                onCapacityChange?.(capacityValue);
                handleCapacityBlur?.();
              }}
            />
          </SettingValue>
        </SettingRow>

        <SettingRow
          label={isInRoastingMode ? '脱水率' : '价格'}
          icon={
            showBeanFormIcons
              ? isInRoastingMode
                ? Droplets
                : BadgeJapaneseYen
              : undefined
          }
        >
          {isInRoastingMode ? (
            <SettingValue trailing="%">
              <SettingValueInput
                type="number"
                inputMode="decimal"
                step="0.1"
                value={displayedMoistureLoss}
                onChange={event => handleMoistureChange(event.target.value)}
                onFocus={() => setIsMoistureFocused(true)}
                onBlur={handleMoistureBlur}
                placeholder="自动计算"
              />
            </SettingValue>
          ) : (
            <SettingValue trailing="¥">
              <AutocompleteInput
                value={bean.price || ''}
                onChange={onBeanChange('price')}
                placeholder="0.00"
                suggestions={[]}
                inputType="number"
                inputMode="decimal"
                allowDecimal
                maxDecimalPlaces={2}
                variant="setting"
                containerClassName="min-w-0 flex-1 space-y-0"
              />
            </SettingValue>
          )}
        </SettingRow>

        {isEdit && onRepurchase && !isRepurchasing && !isInRoastingMode && (
          <SettingRow
            label="操作"
            icon={showBeanFormIcons ? ShoppingCart : undefined}
            onClick={onRepurchase}
          >
            <span className="text-sm leading-none font-medium text-neutral-500 dark:text-neutral-400">
              续购
            </span>
          </SettingRow>
        )}
      </SettingSection>

      <SettingSection compact>
        <SettingRow label="烘焙度" icon={showBeanFormIcons ? Flame : undefined}>
          <SettingValue
            trailing={<ChevronRight className="size-3.5" aria-hidden="true" />}
          >
            <AutocompleteInput
              value={bean.roastLevel || ''}
              onChange={onBeanChange('roastLevel')}
              placeholder="未设置"
              suggestions={roastLevelSuggestions.suggestions}
              readOnly
              dropdownPlacement="top-start"
              variant="setting"
              containerClassName="min-w-0 flex-1 space-y-0"
            />
          </SettingValue>
        </SettingRow>
        <SettingRow
          label={dateLabel}
          icon={showBeanFormIcons ? CalendarDays : undefined}
        >
          {bean.isInTransit && !isGreenBean(bean) ? (
            <span className="text-sm leading-none font-medium text-neutral-500 dark:text-neutral-400">
              在途中
            </span>
          ) : (
            <SettingValue
              trailing={
                <ChevronRight className="size-3.5" aria-hidden="true" />
              }
            >
              <DatePicker
                date={displayDate}
                onDateChange={handleDateChange}
                placeholder={datePlaceholder}
                variant="setting"
                className="min-w-0 flex-1"
              />
            </SettingValue>
          )}
        </SettingRow>
        {!isGreenBean(bean) && (
          <button
            type="button"
            onClick={toggleInTransitState}
            className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3.5 text-sm font-medium text-neutral-800 transition active:opacity-70 dark:text-neutral-200"
          >
            <span
              className={`flex items-center gap-2 ${
                showBeanFormIcons
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : ''
              }`}
            >
              {showBeanFormIcons && (
                <Truck
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              )}
              状态
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              {bean.isInTransit ? '取消在途' : '设为在途'}
            </span>
          </button>
        )}
      </SettingSection>
    </>
  );
};

export default BasicInfo;
