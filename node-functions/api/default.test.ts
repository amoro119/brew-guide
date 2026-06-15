import { afterEach, describe, expect, it, vi } from 'vitest';
import onRequest from './[[default]].js';

function createImageRequest(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  return new Request('https://example.com/api/recognize-bean', {
    method: 'POST',
    body: formData,
  });
}

function mockModelResponse() {
  let payload:
    | {
        messages: Array<{
          content?: Array<{ image_url?: { url?: string } }>;
        }>;
      }
    | undefined;

  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body || '{}'));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"name":"测试咖啡豆"}' } }],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  return {
    getPayload: () => {
      if (!payload) throw new Error('Model request was not sent');
      return payload;
    },
  };
}

async function callRecognizeBean(file: File) {
  return onRequest({
    request: createImageRequest(file),
    env: { QINIU_API_KEY: 'test-key' },
  });
}

describe('recognition image upload validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the detected WebP MIME type when a jpg upload contains WebP bytes', async () => {
    const { getPayload } = mockModelResponse();
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const file = new File([webpBytes], 'cover.jpg', { type: 'image/jpeg' });

    const response = await callRecognizeBean(file);

    expect(response.status).toBe(200);
    expect(
      getPayload().messages[1].content?.[0].image_url?.url?.startsWith(
        'data:image/webp;base64,'
      )
    ).toBe(true);
  });

  it('normalizes the image/jpg alias to image/jpeg', async () => {
    const { getPayload } = mockModelResponse();
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const file = new File([jpegBytes], 'cover.jpg', { type: 'image/jpg' });

    const response = await callRecognizeBean(file);

    expect(response.status).toBe(200);
    expect(
      getPayload().messages[1].content?.[0].image_url?.url?.startsWith(
        'data:image/jpeg;base64,'
      )
    ).toBe(true);
  });

  it('rejects an allowed declaration when the bytes are not an image', async () => {
    const file = new File(['not an image'], 'cover.jpg', {
      type: 'image/jpeg',
    });

    const response = await callRecognizeBean(file);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('文件内容与声明的类型不匹配，请上传有效图片');
  });
});
