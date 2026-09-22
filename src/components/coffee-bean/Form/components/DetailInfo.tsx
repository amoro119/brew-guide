import React from 'react';
import { CalendarCheck, Snowflake, TimerReset } from 'lucide-react';
import AutocompleteInput from '@/components/common/forms/AutocompleteInput';
import FormActionButton, { FormActionRow } from './FormActionButton';
import SettingSection from '@/components/settings/atomic/SettingSection';
import SettingRow from '@/components/settings/atomic/SettingRow';
import SettingValue from '@/components/settings/atomic/SettingValue';
import BlendComponents from './BlendComponents';
import { ExtendedCoffeeBean, BlendComponent } from '../types';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import SegmentedControl from '@/components/ui/SegmentedControl';

type TextBlendField = Exclude<keyof BlendComponent, 'percentage'>;
type BeanType = NonNullable<ExtendedCoffeeBean['beanType']>;

interface DetailInfoProps {
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>;
  onBeanChange: (
    field: keyof Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
  ) => (value: string) => void;
  blendComponents: BlendComponent[];
  onBlendComponentsChange: {
    change: (index: number, field: TextBlendField, value: string) => void;
  };
  autoSetFlavorPeriod: () => void;
  toggleFrozenState: () => void;
}

const BEAN_TYPES: Array<{ value: BeanType; label: string }> = [
  { value: 'filter', label: '手冲' },
  { value: 'espresso', label: '意式' },
  { value: 'omni', label: '全能' },
];

const DetailInfo: React.FC<DetailInfoProps> = ({
  bean,
  onBeanChange,
  blendComponents,
  onBlendComponentsChange,
  autoSetFlavorPeriod,
  toggleFrozenState,
}) => {
  const showBeanFormIcons = useSettingsStore(
    state => state.settings.showBeanFormIcons === true
  );
  const startDay = Number(bean.startDay || 0);
  const endDay = Number(bean.endDay || 0);
  const flavorPeriodFooter =
    startDay > 0 || endDay > 0
      ? `${startDay > 0 ? `${startDay} 天前为养豆期` : '未设置养豆期'}${
          endDay > 0
            ? `，${startDay > 0 ? `${startDay}-` : ''}${endDay} 天为赏味期`
            : '，未设置赏味期结束'
        }`
      : undefined;

  return (
    <>
      <SettingSection compact contentShape="none">
        <SegmentedControl<BeanType>
          options={BEAN_TYPES}
          value={bean.beanType || 'filter'}
          onChange={value => onBeanChange('beanType')(value)}
          size="sm"
          equalWidth
          className="w-full bg-neutral-100 dark:bg-neutral-800 [&_button]:text-sm"
        />
      </SettingSection>

      <BlendComponents
        components={blendComponents}
        onChange={onBlendComponentsChange.change}
      />

      {!bean.isInTransit && !bean.isFrozen && (
        <SettingSection compact footer={flavorPeriodFooter}>
          <SettingRow
            label="养豆期结束"
            icon={showBeanFormIcons ? TimerReset : undefined}
          >
            <SettingValue trailing="天">
              <AutocompleteInput
                value={bean.startDay ? String(bean.startDay) : ''}
                onChange={onBeanChange('startDay')}
                placeholder="未设置"
                suggestions={[]}
                inputType="tel"
                variant="setting"
                containerClassName="min-w-0 flex-1 space-y-0"
              />
            </SettingValue>
          </SettingRow>
          <SettingRow
            label="赏味期结束"
            icon={showBeanFormIcons ? CalendarCheck : undefined}
          >
            <SettingValue trailing="天">
              <AutocompleteInput
                value={bean.endDay ? String(bean.endDay) : ''}
                onChange={onBeanChange('endDay')}
                placeholder="未设置"
                suggestions={[]}
                inputType="tel"
                variant="setting"
                containerClassName="min-w-0 flex-1 space-y-0"
              />
            </SettingValue>
          </SettingRow>
        </SettingSection>
      )}

      {!bean.isInTransit && !bean.isFrozen && (
        <FormActionRow>
          <FormActionButton onClick={autoSetFlavorPeriod}>
            按烘焙度重置
          </FormActionButton>
          <FormActionButton onClick={toggleFrozenState}>
            设为冷冻
          </FormActionButton>
        </FormActionRow>
      )}

      {bean.isFrozen && !bean.isInTransit && (
        <>
          <SettingSection compact>
            <SettingRow
              label="状态"
              icon={showBeanFormIcons ? Snowflake : undefined}
            >
              <span className="text-sm leading-none font-medium text-neutral-500 dark:text-neutral-400">
                冷冻
              </span>
            </SettingRow>
          </SettingSection>

          <FormActionRow>
            <FormActionButton onClick={toggleFrozenState}>
              取消冷冻
            </FormActionButton>
          </FormActionRow>
        </>
      )}
    </>
  );
};

export default DetailInfo;
