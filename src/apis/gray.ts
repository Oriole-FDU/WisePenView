const GRAY_HEADER_DEVELOPER = 'x-developer';
const GRAY_WS_PARAM_DEVELOPER = 'developer';
const GRAY_WS_PARAM_ACTOR_USER_ID = 'actorUserId';

export function getDeveloperTag(): string {
  if (!import.meta.env.DEV) return '';
  return import.meta.env.VITE_X_DEVELOPER?.trim() ?? '';
}

export function applyDeveloperHeader(headers: Headers): Headers {
  const developer = getDeveloperTag();
  if (developer) {
    headers.set(GRAY_HEADER_DEVELOPER, developer);
  }
  return headers;
}

export function getDeveloperHeaders(): Record<string, string> {
  const developer = getDeveloperTag();
  return developer ? { [GRAY_HEADER_DEVELOPER]: developer } : {};
}

export function shouldUseDeveloperWsIdentity(): boolean {
  return Boolean(getDeveloperTag());
}

export function getDeveloperQueryParams(actorUserId?: string): Record<string, string> {
  const developer = getDeveloperTag();
  if (!developer) return {};

  const userId = actorUserId?.trim();
  return userId
    ? {
        [GRAY_WS_PARAM_DEVELOPER]: developer,
        [GRAY_WS_PARAM_ACTOR_USER_ID]: userId,
      }
    : { [GRAY_WS_PARAM_DEVELOPER]: developer };
}
