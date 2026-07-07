import React from 'react';
import { BlendComponent } from '@/types/app';
import AutocompleteInput from '@/components/common/forms/AutocompleteInput';
import { useBlendComponentSuggestions } from '../hooks/useBlendComponentSuggestions';
import { usePresetSuggestions } from '../hooks/usePresetSuggestions';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  getEnabledBeanFieldIds,
  resolveBeanFieldConfig,
  type BeanFieldId,
} from '@/lib/coffee-beans/beanFields';

type TextBlendField = Exclude<keyof BlendComponent, 'percentage'>;
type SuggestionKey = 'origins' | 'estates' | 'processes' | 'varieties';

interface BlendComponentFieldRowsProps {
  component: BlendComponent;
  index: number;
  showEstateField: boolean;
  onChange: (index: number, field: TextBlendField, value: string) => void;
}

const fieldConfigs: Array<{
  field: TextBlendField;
  label: string;
  placeholder: string;
  suggestionKey?: SuggestionKey;
}> = [
  {
    field: 'origin',
    label: '产地',
    placeholder: '产地',
    suggestionKey: 'origins',
  },
  {
    field: 'country',
    label: '产国',
    placeholder: '产国',
    suggestionKey: 'origins',
  },
  {
    field: 'region',
    label: '产区',
    placeholder: '产区',
    suggestionKey: 'origins',
  },
  {
    field: 'estate',
    label: '庄园',
    placeholder: '庄园',
    suggestionKey: 'estates',
  },
  {
    field: 'altitude',
    label: '海拔',
    placeholder: '海拔',
  },
  {
    field: 'process',
    label: '处理法',
    placeholder: '处理法',
    suggestionKey: 'processes',
  },
  {
    field: 'batch',
    label: '批次',
    placeholder: '批次',
  },
  {
    field: 'variety',
    label: '品种',
    placeholder: '品种',
    suggestionKey: 'varieties',
  },
];

interface BlendComponentFieldInputProps {
  config: (typeof fieldConfigs)[number];
  component: BlendComponent;
  index: number;
  suggestions: ReturnType<typeof useBlendComponentSuggestions>;
  onChange: (index: number, field: TextBlendField, value: string) => void;
}

const BlendComponentFieldInput: React.FC<BlendComponentFieldInputProps> = ({
  config,
  component,
  index,
  suggestions,
  onChange,
}) => {
  const presetSuggestions = usePresetSuggestions(
    config.suggestionKey || 'origins',
    config.suggestionKey ? suggestions[config.suggestionKey] : []
  );

  return (
    <AutocompleteInput
      label={config.label}
      value={component[config.field] || ''}
      onChange={value => onChange(index, config.field, value)}
      placeholder={config.placeholder}
      suggestions={presetSuggestions.suggestions}
      clearable
      isCustomPreset={presetSuggestions.isRemovableSuggestion}
      onRemovePreset={presetSuggestions.removeSuggestion}
    />
  );
};

const BlendComponentFieldRows: React.FC<BlendComponentFieldRowsProps> = ({
  component,
  index,
  showEstateField,
  onChange,
}) => {
  const suggestions = useBlendComponentSuggestions();
  const settings = useSettingsStore(state => state.settings);
  const enabledFieldIds = getEnabledBeanFieldIds(
    resolveBeanFieldConfig(settings)
  );
  const visibleFieldIds = new Set<BeanFieldId>(enabledFieldIds);

  fieldConfigs.forEach(config => {
    if (component[config.field]?.trim()) {
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
    <div
      className={`grid gap-3 ${
        visibleFields.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'
      }`}
    >
      {visibleFields.map(config => (
        <BlendComponentFieldInput
          key={config.field}
          config={config}
          component={component}
          index={index}
          suggestions={suggestions}
          onChange={onChange}
        />
      ))}
    </div>
  );
};

export default BlendComponentFieldRows;
