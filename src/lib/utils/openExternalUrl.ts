import type { MouseEvent } from 'react';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (error) {
      console.error(
        'Failed to open external URL in the system browser:',
        error
      );
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function handleExternalUrlClick(
  event: MouseEvent<HTMLAnchorElement>
): void {
  if (!isTauri()) return;

  event.preventDefault();
  void openExternalUrl(event.currentTarget.href);
}
import type React from 'react';
