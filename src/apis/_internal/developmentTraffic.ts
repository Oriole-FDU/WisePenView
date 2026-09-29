import { publicAppConfig } from '@/config/runtimeConfig';

const X_DEVELOPER_HEADER = 'X-Developer';

export function getXDeveloper(): string {
  return publicAppConfig.developerHeader;
}

export function applyXDeveloperHeader(headers: Headers): Headers {
  const developer = getXDeveloper();
  if (developer) {
    headers.set(X_DEVELOPER_HEADER, developer);
  }
  return headers;
}
