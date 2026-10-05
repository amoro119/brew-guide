type Bounds = Pick<DOMRect, 'left' | 'right' | 'top'>;

export function getTabUnderlinePosition(
  tab: Bounds,
  row: Bounds,
  viewport?: Bounds
) {
  const left = viewport ? Math.max(tab.left, viewport.left) : tab.left;
  const right = viewport ? Math.min(tab.right, viewport.right) : tab.right;
  return {
    left: left - row.left,
    top: tab.top - row.top,
    width: Math.max(0, right - left),
  };
}
