import { getApiBaseUrl } from './apiServerAddr';

export function buildApiUrl(path: `/${string}`): string {
  return new URL(path, getApiBaseUrl()).toString();
}
