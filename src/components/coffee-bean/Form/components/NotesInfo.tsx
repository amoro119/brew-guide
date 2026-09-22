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
  return (
    <SettingSection compact contentShape="card">
      <SettingRow vertical>
        <AutoResizeTextarea
          value={bean.notes || ''}
          onChange={event => onBeanChange('notes')(event.target.value)}
          placeholder="添加备注"
          className="w-full bg-transparent text-left text-sm leading-5 font-medium text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
          minRows={2}
          maxRows={8}
        />
      </SettingRow>
    </SettingSection>
  );
};

export default NotesInfo;
