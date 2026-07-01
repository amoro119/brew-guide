const DEFAULT_API_BASE_URL = 'https://coffee.chu3.top';

function getDefaultApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const { origin, protocol } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
  }
  return DEFAULT_API_BASE_URL;
}

export const API_CONFIG = {
  // Web 默认走当前域名的 EdgeOne Functions，原生/非 HTTP 环境回退到线上服务。
  baseURL: (process.env.NEXT_PUBLIC_API_URL || getDefaultApiBaseUrl()).replace(
    /\/+$/,
    ''
  ),
  timeoutMs: 120000,
} as const;
