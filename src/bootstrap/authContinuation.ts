import { STORAGE_KEYS, STORAGE_PREFIXES } from '@/constants/storageKeys';
import { APP_ROUTE_PATH, isAuthRoutePath } from '@/utils/navigation/appRoute';
import { isRecord } from '@/utils/typeGuards';

const AUTH_CONTINUATION_TTL_MS = 30 * 60_000;

export const DEFAULT_AUTH_REDIRECT_PATH = APP_ROUTE_PATH.CHAT;

export type AuthContinuationKind = 'auth' | 'registerOnboarding' | 'verifyEmail' | 'uisVerify';

export interface AuthContinuation {
  id: string;
  kind: AuthContinuationKind;
  redirectPath: string;
  createdAt: number;
}

const parseStoredContinuation = (raw: string | null): AuthContinuation | null => {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    const { id, kind, redirectPath, createdAt } = value;
    if (
      typeof id !== 'string' ||
      (kind !== 'auth' &&
        kind !== 'registerOnboarding' &&
        kind !== 'verifyEmail' &&
        kind !== 'uisVerify') ||
      typeof redirectPath !== 'string' ||
      typeof createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - createdAt > AUTH_CONTINUATION_TTL_MS) return null;
    return { id, kind, redirectPath: sanitizeRedirectPath(redirectPath), createdAt };
  } catch {
    return null;
  }
};

const createContinuationId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const toCurrentPathWithSearchAndHash = (location: Location): string =>
  `${location.pathname}${location.search}${location.hash}`;

const splitRoutePathWithSearch = (
  routePathWithSearch: string
): { pathname: string; search: string } => {
  const fragmentIndex = routePathWithSearch.indexOf('#');
  const pathWithSearch =
    fragmentIndex >= 0 ? routePathWithSearch.slice(0, fragmentIndex) : routePathWithSearch;
  const searchIndex = pathWithSearch.indexOf('?');

  if (searchIndex < 0) {
    return { pathname: pathWithSearch || APP_ROUTE_PATH.HOME, search: '' };
  }

  return {
    pathname: pathWithSearch.slice(0, searchIndex) || APP_ROUTE_PATH.HOME,
    search: pathWithSearch.slice(searchIndex),
  };
};

export const getCurrentRouteSearch = (): string =>
  splitRoutePathWithSearch(toCurrentPathWithSearchAndHash(window.location)).search;

export const sanitizeOptionalRedirectPath = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (isAuthRoutePath(splitRoutePathWithSearch(value).pathname)) return null;
  return value;
};

export const sanitizeRedirectPath = (raw: string | null | undefined): string =>
  sanitizeOptionalRedirectPath(raw) ?? DEFAULT_AUTH_REDIRECT_PATH;

export const readOptionalRedirectParam = (search: string): string | null => {
  const params = new URLSearchParams(search);
  return sanitizeOptionalRedirectPath(params.get('redirect'));
};

export const readRedirectParam = (search: string): string => {
  return readOptionalRedirectParam(search) ?? DEFAULT_AUTH_REDIRECT_PATH;
};

export const appendRedirectParam = (path: string, redirectPath: string): string => {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  params.set('redirect', sanitizeRedirectPath(redirectPath));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const saveAuthContinuation = (
  kind: AuthContinuationKind,
  redirectPath: string
): AuthContinuation | null => {
  try {
    const continuation: AuthContinuation = {
      id: createContinuationId(),
      kind,
      redirectPath: sanitizeRedirectPath(redirectPath),
      createdAt: Date.now(),
    };
    sessionStorage.setItem(
      `${STORAGE_PREFIXES.authContinuation}${continuation.id}`,
      JSON.stringify(continuation)
    );
    sessionStorage.setItem(STORAGE_KEYS.authContinuationActive, continuation.id);
    return continuation;
  } catch {
    return null;
  }
};

export const consumeActiveAuthContinuation = (): AuthContinuation | null => {
  try {
    const activeId = sessionStorage.getItem(STORAGE_KEYS.authContinuationActive);
    if (!activeId) return null;
    const continuation = parseStoredContinuation(
      sessionStorage.getItem(`${STORAGE_PREFIXES.authContinuation}${activeId}`)
    );
    sessionStorage.removeItem(`${STORAGE_PREFIXES.authContinuation}${activeId}`);
    sessionStorage.removeItem(STORAGE_KEYS.authContinuationActive);
    return continuation;
  } catch {
    return null;
  }
};

export const getCurrentRedirectPath = (): string =>
  sanitizeRedirectPath(toCurrentPathWithSearchAndHash(window.location));

export const buildLoginPathForCurrentLocation = (): string => {
  const redirectPath = getCurrentRedirectPath();
  saveAuthContinuation('auth', redirectPath);
  return appendRedirectParam(APP_ROUTE_PATH.AUTH_LOGIN, redirectPath);
};

export const buildRegisterOnboardingPath = (redirectPath: string): string => {
  const safeRedirectPath = sanitizeRedirectPath(redirectPath);
  saveAuthContinuation('registerOnboarding', safeRedirectPath);
  return appendRedirectParam(APP_ROUTE_PATH.AUTH_ONBOARDING_BIND, safeRedirectPath);
};
