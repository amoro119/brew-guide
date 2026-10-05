// 只滚动分类栏，避免 scrollIntoView 连带移动页面；留出左侧固定按钮区。
export function centerCategoryTab(
  container: HTMLElement | null,
  tab = container?.querySelector<HTMLElement>('[data-tab-active="true"]')
): void {
  if (!container || !tab || container.clientWidth === 0) return;

  const containerRect = container.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const coveredWidth = parseFloat(getComputedStyle(container).paddingLeft) || 0;
  const target = Math.min(
    Math.max(0, container.scrollWidth - container.clientWidth),
    Math.max(
      0,
      container.scrollLeft + tabRect.left - containerRect.left - coveredWidth -
        (container.clientWidth - coveredWidth - tabRect.width) / 2
    )
  );
  if (Math.abs(target - container.scrollLeft) < 1) return;

  container.scrollTo({ left: target, behavior: 'smooth' });
}
