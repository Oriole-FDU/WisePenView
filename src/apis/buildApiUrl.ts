import { getApiBaseUrl } from '@/apis/runtime';

export function buildApiUrl(path: `/${string}`): string {
  return new URL(path, getApiBaseUrl()).toString();
}
