'use client';

import Image from 'next/image';
import React, { useCallback, useState } from 'react';
import ActionDrawer from '@/components/common/ui/ActionDrawer';
import { DataManager } from '@/lib/core/dataManager';
import { exportDataAsJsonFile } from '@/lib/utils/dataExportUtils';
import DataAlertIcon from '@public/images/icons/ui/data-alert.svg';

interface LegacyDataNoticeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegacyDataNoticeDrawer: React.FC<LegacyDataNoticeDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [activeView, setActiveView] = useState<'notice' | 'developer-code'>(
    'notice'
  );

  const handleClose = useCallback(() => {
    setActiveView('notice');
    onClose();
  }, [onClose]);

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus(null);
    try {
      const jsonData = await DataManager.exportAllData({
        collectDiagnostics: true,
      });
      await exportDataAsJsonFile(jsonData);
      setExportStatus('success');
    } catch (error) {
      console.error('旧数据导出失败:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const developerButton = (
    <button
      type="button"
      onClick={() => setActiveView('developer-code')}
      className="inline cursor-pointer font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100"
      data-vaul-no-drag
    >
      开发者
    </button>
  );

  const noticeContent =
    exportStatus === 'success' ? (
      <>数据已导出，请联系{developerButton}处理。</>
    ) : exportStatus === 'error' ? (
      <>导出失败，请稍后重试。</>
    ) : (
      <>
        检测到
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          旧版数据
        </span>
        。为保护本地数据，应用
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          不会自动迁移
        </span>
        ，请导出数据后联系{developerButton}处理。
      </>
    );

  return (
    <ActionDrawer
      isOpen={isOpen}
      onClose={handleClose}
      historyId="legacy-data-notice"
    >
      <ActionDrawer.Switcher activeKey={activeView}>
        {activeView === 'developer-code' ? (
          <>
            <ActionDrawer.Content className="flex flex-col items-center">
              <div className="overflow-hidden rounded-lg border border-neutral-400/10 bg-white p-2">
                <Image
                  src="/images/content/chu-code.jpg"
                  alt="开发者二维码"
                  width={200}
                  height={200}
                  className="h-auto w-50"
                />
              </div>
            </ActionDrawer.Content>
            <ActionDrawer.Actions>
              <ActionDrawer.SecondaryButton
                onClick={() => setActiveView('notice')}
              >
                返回
              </ActionDrawer.SecondaryButton>
            </ActionDrawer.Actions>
          </>
        ) : (
          <>
            <ActionDrawer.Icon icon={DataAlertIcon} />
            <ActionDrawer.Content>
              <p className="text-neutral-500 dark:text-neutral-400">
                {noticeContent}
              </p>
            </ActionDrawer.Content>
            <ActionDrawer.Actions>
              <ActionDrawer.SecondaryButton
                onClick={handleClose}
                disabled={isExporting}
              >
                关闭
              </ActionDrawer.SecondaryButton>
              <ActionDrawer.PrimaryButton
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? '正在导出' : '导出数据'}
              </ActionDrawer.PrimaryButton>
            </ActionDrawer.Actions>
          </>
        )}
      </ActionDrawer.Switcher>
    </ActionDrawer>
  );
};

export default LegacyDataNoticeDrawer;
