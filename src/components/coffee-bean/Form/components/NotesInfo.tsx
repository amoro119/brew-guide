import React from 'react';
import AutoResizeTextarea from '@/components/common/forms/AutoResizeTextarea';
import SettingSection from '@/components/settings/atomic/SettingSection';
import SettingRow from '@/components/settings/atomic/SettingRow';
import { ExtendedCoffeeBean } from '../types';

interface NotesInfoProps {
  bean: Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>;
  onBeanChange: (
    field: keyof Omit<ExtendedCoffeeBean, 'id' | 'timestamp'>
  ) => (value: string) => void;
}

const NotesInfo: React.FC<NotesInfoProps> = ({ bean, onBeanChange }) => {
  const [isMultiline, setIsMultiline] = React.useState(false);

  return (
    <SettingSection compact contentShape={isMultiline ? 'card' : 'capsule'}>
      <SettingRow vertical>
        <AutoResizeTextarea
          value={bean.notes || ''}
          onChange={event => onBeanChange('notes')(event.target.value)}
          onMultilineChange={setIsMultiline}
          placeholder="添加备注"
          className={`w-full bg-transparent text-left text-sm font-medium text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500 ${
            isMultiline ? 'leading-5' : 'leading-none'
          }`}
          minRows={1}
        />
      </SettingRow>
    </SettingSection>
  );
};

export default NotesInfo;
