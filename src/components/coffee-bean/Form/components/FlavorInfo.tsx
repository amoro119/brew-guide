import React from 'react';
import { Tags } from 'lucide-react';
import SettingSection from '@/components/settings/atomic/SettingSection';
import SettingRow from '@/components/settings/atomic/SettingRow';
import { ExtendedCoffeeBean } from '../types';
import { useFlavorSuggestions } from '../hooks/useCoffeeBeanFieldSuggestions';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import TagListField from '@/components/coffee-bean/Detail/components/TagListField';

interface FlavorInfoProps {
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>;
  onAddFlavor: (flavorValue: string) => void;
  onRemoveFlavor: (flavor: string) => void;
  onUpdateFlavor: (index: number, flavorValue: string) => void;
}

const FlavorInfo: React.FC<FlavorInfoProps> = ({
  bean,
  onAddFlavor,
  onRemoveFlavor,
  onUpdateFlavor,
}) => {
  const flavorSuggestions = useFlavorSuggestions();
  const showBeanFormIcons = useSettingsStore(
    state => state.settings.showBeanFormIcons === true
  );
  const flavors = bean.flavor || [];

  return (
    <SettingSection compact>
      <SettingRow label="风味描述" icon={showBeanFormIcons ? Tags : undefined}>
        <TagListField
          items={flavors.map((value, index) => ({ id: index, value }))}
          label="风味描述"
          placeholder={flavors.length === 0 ? '输入风味，逗号分隔' : '继续添加'}
          suggestions={flavorSuggestions.suggestions}
          onAdd={onAddFlavor}
          onUpdate={(id, value) => onUpdateFlavor(Number(id), value)}
          onRemove={id => {
            const flavor = flavors[Number(id)];
            if (flavor) onRemoveFlavor(flavor);
          }}
          isCustomPreset={flavorSuggestions.isRemovableSuggestion}
          onRemovePreset={flavorSuggestions.removeSuggestion}
          variant="settings"
        />
      </SettingRow>
    </SettingSection>
  );
};

export default FlavorInfo;
