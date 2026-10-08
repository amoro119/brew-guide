'use client';

import type { Header, Table, RowData } from '@tanstack/react-table';
import { DEFAULT_COLUMN_MAX_SIZE, getKeyboardColumnSize } from './tableSizing';

export default function ColumnResizeHandle<TData extends RowData>({
  header,
  table,
}: {
  header: Header<TData, unknown>;
  table: Table<TData>;
}) {
  const column = header.column;
  const size = column.getSize();
  const min = column.columnDef.minSize ?? 20;
  const max = column.columnDef.maxSize ?? DEFAULT_COLUMN_MAX_SIZE;
  const isResizing = column.getIsResizing();
  const resizeHandler = header.getResizeHandler();
  const label =
    typeof column.columnDef.header === 'string'
      ? column.columnDef.header
      : '列';

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={`调整${label}宽度`}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={size}
      aria-valuetext={`${size}像素`}
      title="拖动调整宽度；双击恢复默认；方向键微调"
      className={`absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
      onMouseDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        resizeHandler(event);
      }}
      onTouchStart={event => {
        event.stopPropagation();
        resizeHandler(event);
      }}
      onDoubleClick={() => column.resetSize()}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        const next = getKeyboardColumnSize(
          event.key,
          size,
          min,
          max,
          event.shiftKey
        );
        if (next === undefined && event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Enter') column.resetSize();
        else table.setColumnSizing(old => ({ ...old, [column.id]: next! }));
      }}
    >
      <span className="absolute top-1/2 right-0 h-4 w-px -translate-y-1/2 bg-neutral-400 dark:bg-neutral-600" />
    </div>
  );
}
