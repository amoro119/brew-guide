import { expect, it, vi } from 'vitest';
import TabButton from './TabButton';

it('runs selection immediately and only switches mode on native dblclick', () => {
  const onClick = vi.fn();
  const onDoubleClick = vi.fn();
  const button = TabButton({
    isActive: true,
    onClick,
    onDoubleClick,
    children: '全部',
  });

  const currentTarget = { closest: () => null };
  expect(button.type).toBe('button');
  button.props.onClick({ detail: 1, currentTarget });
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDoubleClick).not.toHaveBeenCalled();
  button.props.onClick({ detail: 1, currentTarget }); // 独立点击，无论间隔多长都不切换模式。
  expect(onDoubleClick).not.toHaveBeenCalled();
  button.props.onClick({ detail: 2, currentTarget });
  button.props.onDoubleClick();
  expect(onDoubleClick).toHaveBeenCalledTimes(1);
});
