'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SettingsOptions } from './Settings';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useModalHistory, modalHistory } from '@/lib/hooks/useModalHistory';
import ActionDrawer from '@/components/common/ui/ActionDrawer';
import SettingPage from './atomic/SettingPage';
import SettingSection from './atomic/SettingSection';
import SettingRow from './atomic/SettingRow';
import SettingSelector from './atomic/SettingSelector';
import SettingSlider from './atomic/SettingSlider';
import SettingToggle from './atomic/SettingToggle';
import {
  BEAN_FIELD_DEFINITIONS,
  BEAN_FIELD_GROUP_LABELS,
  getEnabledBeanFieldIds,
  resolveBeanFieldConfig,
  type BeanFieldConfig,
  type BeanFieldId,
  type BeanFieldGroupId,
} from '@/lib/coffee-beans/beanFields';

import BeanEstimatedCupSection from './BeanEstimatedCupSection';
import BeanPreview from './BeanPreview';

interface BeanSettingsProps {
  settings: SettingsOptions;
  onClose: () => void;
  handleChange: <K extends keyof SettingsOptions>(
    key: K,
    value: SettingsOptions[K]
  ) => void | Promise<void>;
}

const BeanSettings: React.FC<BeanSettingsProps> = ({
  settings: _settings,
  onClose,
  handleChange: _handleChange,
}) => {
  const settings = useSettingsStore(state => state.settings) as SettingsOptions;
  const updateSettings = useSettingsStore(state => state.updateSettings);

  const handleChange = React.useCallback(
    async <K extends keyof SettingsOptions>(
      key: K,
      value: SettingsOptions[K]
    ) => {
      await updateSettings({ [key]: value } as any);
    },
    [updateSettings]
  );

  const handleBeanRatingTenthStepChange = React.useCallback(
    (checked: boolean) => {
      handleChange('beanRatingTenthStep', checked);
    },
    [handleChange]
  );
  const [showBeanFieldsDrawer, setShowBeanFieldsDrawer] =
    React.useState(false);
  const beanFieldConfig = React.useMemo(
    () => resolveBeanFieldConfig(settings),
    [settings]
  );
  const enabledBeanFieldIds = React.useMemo(
    () => getEnabledBeanFieldIds(beanFieldConfig),
    [beanFieldConfig]
  );
  const enabledBeanFieldCount = enabledBeanFieldIds.length;

  const updateBeanFieldConfig = React.useCallback(
    async (nextConfig: BeanFieldConfig) => {
      await handleChange('beanFieldConfig', nextConfig);
    },
    [handleChange]
  );

  const toggleBeanField = React.useCallback(
    (fieldId: BeanFieldId, checked: boolean) => {
      const nextFields = beanFieldConfig.fields.map(field =>
        field.id === fieldId ? { ...field, enabled: checked } : field
      );
      void updateBeanFieldConfig({ version: 1, fields: nextFields });
    },
    [beanFieldConfig.fields, updateBeanFieldConfig]
  );

  const [isVisible, setIsVisible] = React.useState(false);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleCloseWithAnimation = React.useCallback(() => {
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('subSettingsClosing'));
    setTimeout(() => {
      onCloseRef.current();
    }, 350);
  }, []);

  useModalHistory({
    id: 'bean-settings',
    isOpen: true,
    onClose: handleCloseWithAnimation,
    skipPageExitTransitionOnHistory: true,
  });

  const handleClose = () => {
    modalHistory.back();
  };

  React.useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  return (
    <SettingPage title="咖啡豆" isVisible={isVisible} onClose={handleClose}>
      {/* 预览区域 */}
      <BeanPreview settings={settings} />

      <BeanEstimatedCupSection
        settings={settings}
        handleChange={handleChange}
      />

      <SettingSection title="列表">
        <SettingRow label="日期模式">
          <SettingSelector
            value={settings.dateDisplayMode || 'date'}
            options={[
              { value: 'date', label: '日期' },
              { value: 'flavorPeriod', label: '赏味期' },
              { value: 'agingDays', label: '养豆天数' },
            ]}
            ariaLabel="日期模式"
            onChange={value =>
              handleChange(
                'dateDisplayMode',
                value as 'date' | 'flavorPeriod' | 'agingDays'
              )
            }
          />
        </SettingRow>

        <SettingRow label="价格">
          <SettingToggle
            checked={settings.showPrice !== false}
            onChange={checked => handleChange('showPrice', checked)}
          />
        </SettingRow>

        {settings.showPrice !== false && (
          <SettingRow label="总价" isSubSetting>
            <SettingToggle
              checked={settings.showTotalPrice || false}
              onChange={checked => handleChange('showTotalPrice', checked)}
            />
          </SettingRow>
        )}

        <SettingRow label="状态点">
          <SettingToggle
            checked={settings.showStatusDots || false}
            onChange={checked => handleChange('showStatusDots', checked)}
          />
        </SettingRow>

        <SettingRow label="备注" isLast={settings.showBeanNotes === false}>
          <SettingToggle
            checked={settings.showBeanNotes !== false}
            onChange={checked => handleChange('showBeanNotes', checked)}
          />
        </SettingRow>

        {settings.showBeanNotes !== false && (
          <>
            <SettingRow label="风味" isSubSetting>
              <SettingToggle
                checked={settings.showFlavorInfo || false}
                onChange={checked => handleChange('showFlavorInfo', checked)}
              />
            </SettingRow>
            <SettingRow label="备注内容" isSubSetting>
              <SettingToggle
                checked={settings.showNoteContent !== false}
                onChange={checked => handleChange('showNoteContent', checked)}
              />
            </SettingRow>
            <SettingRow
              label="备注行数限制"
              isLast={!settings.limitNotesLines}
              isSubSetting
            >
              <SettingToggle
                checked={settings.limitNotesLines || false}
                onChange={checked => handleChange('limitNotesLines', checked)}
              />
            </SettingRow>
            {settings.limitNotesLines && (
              <SettingRow isLast vertical>
                <SettingSlider
                  min={1}
                  max={5}
                  step={1}
                  value={settings.notesMaxLines || 3}
                  onChange={val => handleChange('notesMaxLines', val)}
                  minLabel="1行"
                  maxLabel="5行"
                  showTicks
                />
              </SettingRow>
            )}
          </>
        )}
      </SettingSection>

      <SettingSection title="详情页">
        <SettingRow label="标签打印">
          <SettingToggle
            checked={settings.enableBeanPrint || false}
            onChange={checked => handleChange('enableBeanPrint', checked)}
          />
        </SettingRow>
        <SettingRow label="评分" isLast={!(settings.showBeanRating || false)}>
          <SettingToggle
            checked={settings.showBeanRating || false}
            onChange={checked => handleChange('showBeanRating', checked)}
          />
        </SettingRow>
        {(settings.showBeanRating || false) && (
          <SettingRow label="十分位制" isSubSetting isLast>
            <SettingToggle
              checked={settings.beanRatingTenthStep || false}
              onChange={handleBeanRatingTenthStepChange}
            />
          </SettingRow>
        )}
      </SettingSection>

      <SettingSection title="添加">
        <SettingRow label="自动填充图片">
          <SettingToggle
            checked={settings.autoFillRecognitionImage || false}
            onChange={checked =>
              handleChange('autoFillRecognitionImage', checked)
            }
          />
        </SettingRow>
        <SettingRow label="烘焙商">
          <SettingToggle
            checked={settings.roasterFieldEnabled !== false}
            onChange={async checked => {
              await handleChange('roasterFieldEnabled', checked);
            }}
          />
        </SettingRow>
        {settings.roasterFieldEnabled !== false && (
          <SettingRow label="烘焙商分隔符" isSubSetting>
            <SettingSelector
              value={settings.roasterSeparator || ' '}
              options={[
                { value: ' ', label: '空格' },
                { value: '/', label: '/' },
              ]}
              ariaLabel="烘焙商分隔符"
              onChange={value => {
                handleChange('roasterSeparator', value as ' ' | '/');
              }}
            />
          </SettingRow>
        )}
        <SettingRow label="咖啡豆字段" isLast>
          <button
            type="button"
            onClick={() => setShowBeanFieldsDrawer(true)}
            className="flex cursor-pointer items-center gap-1 text-sm font-medium text-neutral-600 transition active:opacity-70 dark:text-neutral-300"
          >
            <span>{enabledBeanFieldCount} 个</span>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          </button>
        </SettingRow>
      </SettingSection>

      <ActionDrawer
        isOpen={showBeanFieldsDrawer}
        onClose={() => setShowBeanFieldsDrawer(false)}
        historyId="bean-field-settings"
      >
        <ActionDrawer.Content className="mb-8!">
          <div className="mb-5 px-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              咖啡豆字段
            </h2>
          </div>

          {(['origin', 'processing', 'variety'] as BeanFieldGroupId[]).map(
            group => {
              const fields = BEAN_FIELD_DEFINITIONS.filter(
                definition => definition.group === group
              );

              return (
                <div key={group} className="mb-5">
                  <div className="mb-2 px-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    {BEAN_FIELD_GROUP_LABELS[group]}
                  </div>
                  <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60">
                    {fields.map((definition, index) => {
                      const isEnabled = enabledBeanFieldIds.includes(
                        definition.id
                      );
                      const label =
                        definition.id === 'origin'
                          ? '产地概括'
                          : definition.label;

                      return (
                        <div
                          key={definition.id}
                          className="flex items-stretch px-3.5"
                        >
                          <div
                            className={`flex min-w-0 flex-1 items-center justify-between py-3.5 ${
                              index < fields.length - 1
                                ? 'border-b border-black/5 dark:border-white/5'
                                : ''
                            }`}
                          >
                            <div className="mr-4 min-w-0">
                              <div className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                {label}
                              </div>
                              {definition.id === 'origin' && (
                                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  旧数据和概括产地使用
                                </div>
                              )}
                            </div>
                            <SettingToggle
                              checked={isEnabled}
                              onChange={checked =>
                                toggleBeanField(definition.id, checked)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </ActionDrawer.Content>
      </ActionDrawer>
    </SettingPage>
  );
};

export default BeanSettings;
