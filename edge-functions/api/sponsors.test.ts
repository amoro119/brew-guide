import { afterEach, describe, expect, it } from 'vitest';
import onRequest from './sponsors.js';

async function callSponsors(method = 'GET') {
  return onRequest({
    request: new Request('https://example.com/api/sponsors', { method }),
  });
}

describe('sponsors edge function', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'SPONSORS_KV');
  });

  it('returns names from the EdgeOne global KV binding', async () => {
    Object.defineProperty(globalThis, 'SPONSORS_KV', {
      configurable: true,
      value: {
        async get(key: string) {
          expect(key).toBe('sponsors_list');
          return JSON.stringify({
            names: ['Asura', 'QD', 'Asura', '  云峰  '],
          });
        },
      },
    });

    const response = await callSponsors();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age=60');
    expect(body).toEqual({
      success: true,
      names: ['Asura', 'QD', '云峰'],
    });
  });

  it('falls back to an empty list when KV is not bound', async () => {
    const response = await callSponsors();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.names).toEqual([]);
  });

  it('rejects unsupported methods', async () => {
    const response = await callSponsors('POST');
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe('Method Not Allowed');
  });
});
