import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pickImages: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
    pickImages: mocks.pickImages,
  },
  CameraResultType: {
    Base64: 'base64',
    DataUrl: 'dataUrl',
    Uri: 'uri',
  },
  CameraSource: {
    Camera: 'CAMERA',
    Photos: 'PHOTOS',
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: mocks.readFile,
  },
}));

import { pickNativeGalleryImageFiles } from './imageCapture';

describe('pickNativeGalleryImageFiles', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('reads native gallery photos from path instead of fetching webPath', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchSpy);
    mocks.pickImages.mockResolvedValue({
      photos: [
        {
          format: 'jpeg',
          path: 'file:///cache/photo.jpg',
          webPath: 'http://localhost/_capacitor_file_/photo.jpg',
        },
      ],
    });
    mocks.readFile.mockResolvedValue({ data: 'aW1hZ2UtYnl0ZXM=' });

    const [file] = await pickNativeGalleryImageFiles({ limit: 1 });

    expect(mocks.pickImages).toHaveBeenCalledWith({
      correctOrientation: true,
      limit: 1,
      quality: 90,
    });
    expect(mocks.readFile).toHaveBeenCalledWith({
      path: 'file:///cache/photo.jpg',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(file).toMatchObject({
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
    expect(await file.text()).toBe('image-bytes');
  });
});
