import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API_CONFIG', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses the online EdgeOne service inside the bundled Capacitor app', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubGlobal('window', {
      location: {
        origin: 'https://app',
        protocol: 'https:',
        hostname: 'app',
      },
    });

    const { API_CONFIG } = await import('./config');

    expect(API_CONFIG.baseURL).toBe('https://coffee.chu3.top');
  });

  it('uses the online EdgeOne service inside the bundled Tauri app', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubGlobal('window', {
      location: {
        origin: 'http://tauri.localhost',
        protocol: 'http:',
        hostname: 'tauri.localhost',
      },
    });

    const { API_CONFIG } = await import('./config');

    expect(API_CONFIG.baseURL).toBe('https://coffee.chu3.top');
  });

  it('uses the current origin for a deployed website', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubGlobal('window', {
      location: {
        origin: 'https://preview.example.com',
        protocol: 'https:',
        hostname: 'preview.example.com',
      },
    });

    const { API_CONFIG } = await import('./config');

    expect(API_CONFIG.baseURL).toBe('https://preview.example.com');
  });

  it('keeps an explicit API URL as the highest-priority override', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/');
    vi.stubGlobal('window', {
      location: {
        origin: 'https://app',
        protocol: 'https:',
        hostname: 'app',
      },
    });

    const { API_CONFIG } = await import('./config');

    expect(API_CONFIG.baseURL).toBe('https://api.example.com');
  });
});
