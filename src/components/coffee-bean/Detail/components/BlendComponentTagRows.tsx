'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Factory,
  Globe2,
  Hash,
  House,
  Map,
  MapPin,
  Mountain,
  Sprout,
  Waves,
} from 'lucide-react';
import { BlendComponent } from '@/types/app';
import { useBlendComponentSuggestions } from '@/components/coffee-bean/Form/hooks/useBlendComponentSuggestions';
import { usePresetSuggestions } from '@/components/coffee-bean/Form/hooks/usePresetSuggestions';
import TagListField from './TagListField';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  getComponentFieldValue,
  getEnabledBeanFieldIds,
  resolveBeanFieldConfig,
  type BeanFieldId,
} from '@/lib/coffee-beans/beanFields';
import type { BlendPresetKey } from '@/components/coffee-bean/Form/constants';

type TextBlendField = Exclude<keyof BlendComponent, 'percentage'>;

interface BlendComponentTagRowsProps {
  components: BlendComponent[];
  showEstateField: boolean;
  onChange: (index: number, field: TextBlendField, value: string) => void;
  variant?: 'immersive' | 'settings';
}

const fieldConfigs: Array<{
  field: TextBlendField;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  suggestionKey?: BlendPresetKey;
}> = [
  {
    field: 'origin',
    label: '产地',
    icon: MapPin,
    placeholder: '输入产地，逗号分隔',
    suggestionKey: 'origins',
  },
  {
    field: 'country',
    label: '产国',
    icon: Globe2,
    placeholder: '输入产国，逗号分隔',
    suggestionKey: 'countries',
  },
  {
    field: 'region',
    label: '产区',
    icon: Map,
    placeholder: '输入产区，逗号分隔',
    suggestionKey: 'regions',
  },
  {
    field: 'estate',
    label: '庄园',
    icon: House,
    placeholder: '输入庄园，逗号分隔',
    suggestionKey: 'estates',
  },
  {
    field: 'processingStation',
    label: '处理站',
    icon: Factory,
    placeholder: '输入处理站，逗号分隔',
    suggestionKey: 'processingStations',
  },
  {
    field: 'altitude',
    label: '海拔',
    icon: Mountain,
    placeholder: '输入海拔，逗号分隔',
    suggestionKey: 'altitudes',
  },
  {
    field: 'process',
    label: '处理法',
    icon: Waves,
    placeholder: '输入处理法，逗号分隔',
    suggestionKey: 'processes',
  },
  {
    field: 'batch',
    label: '批次',
    icon: Hash,
    placeholder: '输入批次，逗号分隔',
    suggestionKey: 'batches',
  },
  {
    field: 'variety',
    label: '品种',
    icon: Sprout,
    placeholder: '输入品种，逗号分隔',
    suggestionKey: 'varieties',
  },
];

const getAppendIndex = (
  components: BlendComponent[],
  field: TextBlendField
) => {
  const emptyIndex = components.findIndex(
    component => !String(component[field] || '').trim()
  );

  return emptyIndex === -1 ? components.length : emptyIndex;
};

const getFieldEntries = (components: BlendComponent[], field: TextBlendField) =>
  components
    .map((component, index) => ({
      index,
      value: String(component[field] || '').trim(),
    }))
    .filter(entry => entry.value);

interface BlendComponentTagFieldProps {
  config: (typeof fieldConfigs)[number];
  components: BlendComponent[];
  suggestions: ReturnType<typeof useBlendComponentSuggestions>;
  onChange: (index: number, field: TextBlendField, value: string) => void;
  variant: 'immersive' | 'settings';
  isLast: boolean;
  showIcon: boolean;
}

const BlendComponentTagField: React.FC<BlendComponentTagFieldProps> = ({
  config,
  components,
  suggestions,
  onChange,
  variant,
  isLast,
  showIcon,
}) => {
  const entries = getFieldEntries(components, config.field);
  const isSettings = variant === 'settings';
  const Icon = config.icon;
  const presetSuggestions = usePresetSuggestions(
    config.suggestionKey || 'origins',
    config.suggestionKey ? suggestions[config.suggestionKey] : []
  );

  return (
    <div className={isSettings ? 'px-3.5' : undefined}>
      <div
        className={
          isSettings
            ? `flex items-center justify-between py-3.5 ${
                isLast ? '' : 'border-b border-black/5 dark:border-white/5'
              }`
            : 'flex items-start'
        }
      >
        <div
          className={
            isSettings
              ? `mr-4 flex shrink-0 items-center text-sm leading-none font-medium ${
                  showIcon
                    ? 'gap-2 text-neutral-500 dark:text-neutral-400'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`
              : 'w-16 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400'
          }
        >
          {isSettings && showIcon && (
            <Icon
              className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          )}
          {config.label}
        </div>
        <TagListField
          items={entries.map(entry => ({
            id: entry.index,
            value: entry.value,
          }))}
          label={config.label}
          placeholder={entries.length === 0 ? config.placeholder : '继续添加'}
          suggestions={presetSuggestions.suggestions}
          onAdd={value =>
            onChange(
              getAppendIndex(components, config.field),
              config.field,
              value
            )
          }
          onUpdate={(id, value) => onChange(Number(id), config.field, value)}
          onRemove={id => onChange(Number(id), config.field, '')}
          isCustomPreset={presetSuggestions.isRemovableSuggestion}
          onRemovePreset={presetSuggestions.removeSuggestion}
          variant={variant}
        />
      </div>
    </div>
  );
};

const BlendComponentTagRows: React.FC<BlendComponentTagRowsProps> = ({
  components,
  showEstateField,
  onChange,
  variant = 'immersive',
}) => {
  const suggestions = useBlendComponentSuggestions();
  const settings = useSettingsStore(state => state.settings);
  const showBeanFormIcons = settings.showBeanFormIcons === true;
  const enabledFieldIds = getEnabledBeanFieldIds(
    resolveBeanFieldConfig(settings)
  );
  const visibleFieldIds = new Set<BeanFieldId>(enabledFieldIds);

  fieldConfigs.forEach(config => {
    if (
      components.some(component =>
        getComponentFieldValue(component, config.field as BeanFieldId)
      )
    ) {
      visibleFieldIds.add(config.field as BeanFieldId);
    }
  });

  if (showEstateField) {
    visibleFieldIds.add('estate');
  }

  const visibleFields = fieldConfigs.filter(config =>
    visibleFieldIds.has(config.field as BeanFieldId)
  );

  return (
    <div className={variant === 'settings' ? '' : 'space-y-3'}>
      {visibleFields.map((config, index) => (
        <BlendComponentTagField
          key={config.field}
          config={config}
          components={components}
          suggestions={suggestions}
          onChange={onChange}
          variant={variant}
          isLast={index === visibleFields.length - 1}
          showIcon={showBeanFormIcons}
        />
      ))}
    </div>
  );
};

export default BlendComponentTagRows;
