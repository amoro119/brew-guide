import { describe, expect, it } from 'vitest';
import { getDataUrlImageDimensions } from './dimensions';

const bytesToDataUrl = (mimeType: string, bytes: number[]) =>
  `data:${mimeType};base64,${btoa(String.fromCharCode(...bytes))}`;

const asciiBytes = (text: string) =>
  Array.from(text).map(char => char.charCodeAt(0));

describe('image dimensions', () => {
  it('reads PNG dimensions from the data URL header', () => {
    const png = bytesToDataUrl(
      'image/png',
      [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x02, 0x80, 0x00, 0x00, 0x01, 0xe0,
      ]
    );

    expect(getDataUrlImageDimensions(png)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('reads JPEG dimensions from a start-of-frame segment', () => {
    const jpeg = bytesToDataUrl(
      'image/jpeg',
      [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11,
        0x08, 0x03, 0x20, 0x04, 0xb0,
      ]
    );

    expect(getDataUrlImageDimensions(jpeg)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it('reads GIF dimensions from the logical screen descriptor', () => {
    const gif = bytesToDataUrl('image/gif', [
      ...asciiBytes('GIF89a'),
      0x40,
      0x01,
      0xf0,
      0x00,
    ]);

    expect(getDataUrlImageDimensions(gif)).toEqual({
      width: 320,
      height: 240,
    });
  });

  it('reads WebP dimensions from a VP8X chunk', () => {
    const webp = bytesToDataUrl('image/webp', [
      ...asciiBytes('RIFF'),
      0x1e,
      0x00,
      0x00,
      0x00,
      ...asciiBytes('WEBP'),
      ...asciiBytes('VP8X'),
      0x0a,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x7f,
      0x02,
      0x00,
      0xdf,
      0x01,
      0x00,
    ]);

    expect(getDataUrlImageDimensions(webp)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('ignores unsupported or malformed URLs', () => {
    expect(getDataUrlImageDimensions('https://example.com/image.jpg')).toBe(
      null
    );
    expect(getDataUrlImageDimensions('data:image/png,not-base64')).toBe(null);
    expect(getDataUrlImageDimensions(undefined)).toBe(null);
  });
});
