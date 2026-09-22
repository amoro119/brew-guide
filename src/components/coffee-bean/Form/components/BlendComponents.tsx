import React, { useMemo } from 'react';
import { BlendComponent } from '@/types/app';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import SettingSection from '@/components/settings/atomic/SettingSection';
import BlendComponentTagRows from '@/components/coffee-bean/Detail/components/BlendComponentTagRows';

type TextBlendField = Exclude<keyof BlendComponent, 'percentage'>;

interface BlendComponentsProps {
  components: BlendComponent[];
  onChange: (index: number, field: TextBlendField, value: string) => void;
}

const BlendComponents: React.FC<BlendComponentsProps> = ({
  components,
  onChange,
}) => {
  // 庄园字段显示设置 - 从 settingsStore 获取
  const showEstateFieldSetting = useSettingsStore(
    state => state.settings.showEstateField || false
  );

  // 检查是否有任何成分已有庄园数据
  const hasExistingEstate = useMemo(() => {
    return components.some(comp => comp.estate && comp.estate.trim() !== '');
  }, [components]);

  // 是否因“已有/输入过庄园”而触发显示（进入表单后保持到退出）
  const [estateFieldStickyByData, setEstateFieldStickyByData] =
    React.useState(hasExistingEstate);

  React.useEffect(() => {
    if (hasExistingEstate) {
      setEstateFieldStickyByData(true);
    }
  }, [hasExistingEstate]);

  // 最终是否显示庄园字段：设置开启 或 数据触发（并在会话内保持）
  const showEstateField = showEstateFieldSetting || estateFieldStickyByData;

  return (
    <SettingSection title="成分" contentShape="card">
      <BlendComponentTagRows
        components={components}
        showEstateField={showEstateField}
        onChange={onChange}
        variant="settings"
      />
    </SettingSection>
  );
};

export default BlendComponents;
