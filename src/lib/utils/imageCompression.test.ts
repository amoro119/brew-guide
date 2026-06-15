import { describe, expect, it } from 'vitest';
import { smartCompress } from './imageCompression';

describe('smartCompress', () => {
  it('preserves small images while correcting a mismatched WebP MIME type', async () => {
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const file = new File([webpBytes], 'cover.jpg', { type: 'image/jpeg' });

    const result = await smartCompress(file);

    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('cover.webp');
    expect(result.size).toBe(file.size);
  });
});
