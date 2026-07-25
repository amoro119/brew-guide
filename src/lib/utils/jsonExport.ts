'use client';

import {
  TempFileManager,
  type JsonFileSaveMode,
} from '@/lib/utils/tempFileManager';

export type JsonExportMode = JsonFileSaveMode;

export interface JsonExportResult {
  mode: JsonExportMode;
  fileName: string;
}

export interface JsonExportOptions {
  jsonData: string;
  fileName: string;
  title?: string;
  text?: string;
  dialogTitle?: string;
  returnIncompleteResult?: boolean;
}

const JSON_EXTENSION = '.json';

const ensureJsonFileName = (fileName: string): string => {
  const trimmedFileName = fileName.trim();

  if (!trimmedFileName) {
    throw new Error('导出文件名不能为空');
  }

  return trimmedFileName.endsWith(JSON_EXTENSION)
    ? trimmedFileName
    : `${trimmedFileName}${JSON_EXTENSION}`;
};

export async function exportJsonFile({
  jsonData,
  fileName,
  title = '导出数据',
  text = '请选择保存位置',
  dialogTitle = '导出数据',
  returnIncompleteResult = false,
}: JsonExportOptions): Promise<JsonExportResult> {
  const normalizedFileName = ensureJsonFileName(fileName);
  const mode = await TempFileManager.saveJsonFile(jsonData, normalizedFileName, {
    title,
    text,
    dialogTitle,
  });

  if (!returnIncompleteResult && mode === 'activation-required') {
    throw new Error('分享需要再次点击');
  }

  if (!returnIncompleteResult && mode === 'cancelled') {
    throw new Error('已取消分享');
  }

  return {
    mode,
    fileName: normalizedFileName,
  };
}
