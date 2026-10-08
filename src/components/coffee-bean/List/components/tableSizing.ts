import type { ColumnSizingState } from '@tanstack/react-table';
import type { TableColumnKey } from './tableColumns';

export const DEFAULT_COLUMN_MAX_SIZE = 1600;
export const COLUMN_SIZE_CONFIG: Record<
  TableColumnKey,
  { size: number; minSize: number; maxSize?: number }
> = {
  roaster: { size: 125, minSize: 100 },
  name: { size: 200, minSize: 100 },
  flavorPeriod: { size: 90, minSize: 70 },
  capacity: { size: 90, minSize: 90 },
  price: { size: 90, minSize: 90 },
  beanType: { size: 70, minSize: 65 },
  origin: { size: 100, minSize: 90 },
  estate: { size: 100, minSize: 90 },
  process: { size: 100, minSize: 90 },
  variety: { size: 100, minSize: 90 },
  roastLevel: { size: 90, minSize: 90 },
  flavor: { size: 200, minSize: 100 },
  rating: { size: 90, minSize: 90 },
  notes: { size: 200, minSize: 160 },
};

export const parseColumnSizing = (saved: string | null): ColumnSizingState => {
  const parsed: unknown = saved ? JSON.parse(saved) : null;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const sizes: ColumnSizingState = {};
  for (const [id, size] of Object.entries(parsed)) {
    if (
      !Object.hasOwn(COLUMN_SIZE_CONFIG, id) ||
      typeof size !== 'number' ||
      !Number.isFinite(size) ||
      size <= 0
    )
      continue;
    sizes[id] = Math.min(
      DEFAULT_COLUMN_MAX_SIZE,
      Math.max(COLUMN_SIZE_CONFIG[id as TableColumnKey].minSize, size)
    );
  }
  return sizes;
};

export const getKeyboardColumnSize = (
  key: string,
  size: number,
  min: number,
  max: number,
  shiftKey = false
): number | undefined => {
  const step = shiftKey ? 50 : 10;
  switch (key) {
    case 'ArrowLeft':
      return Math.max(min, size - step);
    case 'ArrowRight':
      return Math.min(max, size + step);
    case 'Home':
      return min;
    case 'End':
      return max;
    default:
      return undefined;
  }
};
