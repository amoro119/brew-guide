import { afterEach, describe, expect, it, vi } from 'vitest';

const openUrl = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl }));

describe('openExternalUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the system browser in Tauri', async () => {
    vi.stubGlobal('window', { __TAURI__: {}, open: vi.fn() });
    const { openExternalUrl } = await import('./openExternalUrl');

    await openExternalUrl('https://example.com');

    expect(openUrl).toHaveBeenCalledWith('https://example.com');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('uses window.open in a browser', async () => {
    const windowOpen = vi.fn();
    vi.stubGlobal('window', { open: windowOpen });
    const { openExternalUrl } = await import('./openExternalUrl');

    await openExternalUrl('https://example.com');

    expect(windowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
    expect(openUrl).not.toHaveBeenCalled();
  });
});
