export interface ImageDimensions {
  width: number;
  height: number;
}

const DATA_URL_PREFIX = 'data:image/';
const MAX_HEADER_BYTES = 256 * 1024;

const startsWithBytes = (
  bytes: Uint8Array,
  signature: number[],
  offset = 0
): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

const readAscii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.slice(start, end));

const readUint16BE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] << 8) | bytes[offset + 1];

const readUint16LE = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] | (bytes[offset + 1] << 8);

const readUint24LE = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] * 0x1000000 +
  ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);

const readUint32LE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>>
  0;

const toDimensions = (width: number, height: number): ImageDimensions | null =>
  width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)
    ? { width, height }
    : null;

const decodeBase64Header = (
  payload: string,
  maxBytes = MAX_HEADER_BYTES
): Uint8Array | null => {
  if (typeof atob === 'undefined') return null;

  const maxChars = Math.ceil(maxBytes / 3) * 4;
  const isPartial = payload.length > maxChars;
  let chunk = payload.slice(0, maxChars);

  if (isPartial) {
    chunk = chunk.slice(0, chunk.length - (chunk.length % 4));
  }

  if (!chunk) return null;

  try {
    const binary = atob(chunk);
    const length = Math.min(binary.length, maxBytes);
    const bytes = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
};

const getPngDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (
    !startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    bytes.length < 24
  ) {
    return null;
  }

  return toDimensions(readUint32BE(bytes, 16), readUint32BE(bytes, 20));
};

const isStartOfFrameMarker = (marker: number): boolean =>
  marker >= 0xc0 &&
  marker <= 0xcf &&
  marker !== 0xc4 &&
  marker !== 0xc8 &&
  marker !== 0xcc;

const getJpegDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (!startsWithBytes(bytes, [0xff, 0xd8])) return null;

  let offset = 2;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2) return null;

    if (isStartOfFrameMarker(marker)) {
      if (offset + 7 > bytes.length) return null;

      return toDimensions(
        readUint16BE(bytes, offset + 5),
        readUint16BE(bytes, offset + 3)
      );
    }

    offset += segmentLength;
  }

  return null;
};

const getGifDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (!startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38]) || bytes.length < 10) {
    return null;
  }

  return toDimensions(readUint16LE(bytes, 6), readUint16LE(bytes, 8));
};

const getWebpDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (
    !startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) ||
    !startsWithBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return null;
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = readAscii(bytes, offset, offset + 4);
    const chunkSize = readUint32LE(bytes, offset + 4);
    const payloadOffset = offset + 8;

    if (chunkType === 'VP8X' && payloadOffset + 10 <= bytes.length) {
      return toDimensions(
        readUint24LE(bytes, payloadOffset + 4) + 1,
        readUint24LE(bytes, payloadOffset + 7) + 1
      );
    }

    if (chunkType === 'VP8 ' && payloadOffset + 10 <= bytes.length) {
      if (
        bytes[payloadOffset + 3] === 0x9d &&
        bytes[payloadOffset + 4] === 0x01 &&
        bytes[payloadOffset + 5] === 0x2a
      ) {
        return toDimensions(
          readUint16LE(bytes, payloadOffset + 6) & 0x3fff,
          readUint16LE(bytes, payloadOffset + 8) & 0x3fff
        );
      }
    }

    if (
      chunkType === 'VP8L' &&
      payloadOffset + 5 <= bytes.length &&
      bytes[payloadOffset] === 0x2f
    ) {
      return toDimensions(
        ((bytes[payloadOffset + 2] & 0x3f) << 8) + bytes[payloadOffset + 1] + 1,
        ((bytes[payloadOffset + 4] & 0x0f) << 10) +
          (bytes[payloadOffset + 3] << 2) +
          ((bytes[payloadOffset + 2] & 0xc0) >> 6) +
          1
      );
    }

    if (chunkSize <= 0) return null;

    offset = payloadOffset + chunkSize + (chunkSize % 2);
  }

  return null;
};

export const getDataUrlImageDimensions = (
  dataUrl: string | undefined
): ImageDimensions | null => {
  if (!dataUrl?.startsWith(DATA_URL_PREFIX)) return null;

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1 || !dataUrl.slice(0, commaIndex).includes(';base64')) {
    return null;
  }

  const bytes = decodeBase64Header(dataUrl.slice(commaIndex + 1));
  if (!bytes) return null;

  return (
    getPngDimensions(bytes) ||
    getJpegDimensions(bytes) ||
    getGifDimensions(bytes) ||
    getWebpDimensions(bytes)
  );
};
