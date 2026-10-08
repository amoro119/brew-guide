import {
  createTable,
  functionalUpdate,
  getCoreRowModel,
  type TableState,
} from '@tanstack/react-table';
import { afterEach, expect, it, vi } from 'vitest';
import ColumnResizeHandle from './ColumnResizeHandle';
import { COLUMN_SIZE_CONFIG, DEFAULT_COLUMN_MAX_SIZE } from './tableSizing';

const makeTable = () => {
  const table = createTable({
    data: [{ name: '测试' }],
    columns: [
      { accessorKey: 'name', header: '名称', ...COLUMN_SIZE_CONFIG.name },
    ],
    defaultColumn: { maxSize: DEFAULT_COLUMN_MAX_SIZE },
    state: {} as TableState,
    onStateChange: updater =>
      table.setOptions(old => ({
        ...old,
        state: functionalUpdate(updater, old.state as TableState),
      })),
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  });
  table.setOptions(old => ({ ...old, state: table.initialState }));
  return table;
};

afterEach(() => vi.unstubAllGlobals());

it('wires mouse dragging to TanStack sizing, releases it, and restores the default width', () => {
  const documentTarget = new EventTarget();
  vi.stubGlobal('document', documentTarget);
  const table = makeTable();
  const header = table.getHeaderGroups()[0].headers[0];
  const handle = ColumnResizeHandle({ table, header });
  handle.props.onMouseDown({
    button: 0,
    clientX: 200,
    preventDefault() {},
    stopPropagation() {},
  });
  documentTarget.dispatchEvent(
    Object.assign(new Event('mousemove'), { clientX: 600 })
  );
  expect(header.column.getSize()).toBe(600);
  expect(header.column.getIsResizing()).toBe(true);
  documentTarget.dispatchEvent(
    Object.assign(new Event('mouseup'), { clientX: 650 })
  );
  expect(header.column.getSize()).toBe(650);
  expect(header.column.getIsResizing()).toBe(false);
  documentTarget.dispatchEvent(
    Object.assign(new Event('mousemove'), { clientX: 800 })
  );
  expect(header.column.getSize()).toBe(650);
  handle.props.onDoubleClick();
  expect(header.column.getSize()).toBe(200);
});

it('keeps keyboard resizing and reset on the same TanStack state', () => {
  const table = makeTable();
  const header = table.getHeaderGroups()[0].headers[0];
  const pressKey = (key: string, shiftKey = false) => {
    ColumnResizeHandle({ table, header }).props.onKeyDown({
      key,
      shiftKey,
      preventDefault() {},
      stopPropagation() {},
    });
  };
  pressKey('ArrowRight', true);
  expect(header.column.getSize()).toBe(250);
  pressKey('Home');
  expect(header.column.getSize()).toBe(100);
  pressKey('ArrowLeft');
  expect(header.column.getSize()).toBe(100);
  pressKey('Enter');
  expect(header.column.getSize()).toBe(200);
});
