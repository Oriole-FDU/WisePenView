import type { OssStsTokenApiResponse } from '@/domains/_shared/apis/ossStsApi.type';
import { registerServiceCacheCleaner } from '@/domains/_shared/cacheRegistry';
import { createClientError, FRONTEND_CLIENT_ERROR, isWisePenError } from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';
import OSS from 'ali-oss';

export interface OssStsClientManagerOptions<Key> {
  loadToken: (key: Key) => Promise<OssStsTokenApiResponse | null | undefined>;
  resolveCacheKey: (key: Key) => string;
  refreshBufferMs?: number;
  defaultExpiresInMs?: number;
}

export interface OssStsClientManager<Key> {
  getClient: (key: Key, options?: { forceRefresh?: boolean }) => Promise<OSS>;
  runWithClient: <Result>(key: Key, operation: (client: OSS) => Promise<Result>) => Promise<Result>;
  clear: () => void;
}

interface CachedOssClient {
  client: OSS;
  expiresAt: number;
}

const DEFAULT_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_EXPIRES_IN_MS = 55 * 60_000;

const resolveExpiresAt = (expiration: string | undefined, defaultExpiresInMs: number): number => {
  if (!expiration) return Date.now() + defaultExpiresInMs;
  const expiresAt = Date.parse(expiration);
  return Number.isFinite(expiresAt) ? expiresAt : Date.now() + defaultExpiresInMs;
};

const createOssClient = (token: OssStsTokenApiResponse): OSS => {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    (!token.region && !token.endpoint)
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.OSS_CREDENTIAL_INVALID);
  }

  return new OSS({
    region: token.region,
    endpoint: token.endpoint,
    bucket: token.bucket,
    accessKeyId: token.accessKeyId,
    accessKeySecret: token.accessKeySecret,
    stsToken: token.securityToken,
    secure: true,
  });
};

const isOssAuthExpiredError = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  const status = error.status ?? error.statusCode;
  const code = typeof error.code === 'string' ? error.code : '';
  return (
    status === 403 ||
    status === '403' ||
    code === 'SecurityTokenExpired' ||
    code === 'InvalidAccessKeyId'
  );
};

export const createOssStsClientManager = <Key>(
  options: OssStsClientManagerOptions<Key>
): OssStsClientManager<Key> => {
  const refreshBufferMs = options.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
  const defaultExpiresInMs = options.defaultExpiresInMs ?? DEFAULT_EXPIRES_IN_MS;
  const clientCache = new Map<string, CachedOssClient>();
  const pendingClientCache = new Map<string, Promise<OSS>>();
  let cacheGeneration = 0;

  const clear = (): void => {
    cacheGeneration += 1;
    clientCache.clear();
    pendingClientCache.clear();
  };

  registerServiceCacheCleaner(clear);

  const getClient = async (key: Key, getOptions?: { forceRefresh?: boolean }): Promise<OSS> => {
    const cacheKey = options.resolveCacheKey(key);
    if (getOptions?.forceRefresh) {
      clientCache.delete(cacheKey);
    } else {
      const cached = clientCache.get(cacheKey);
      if (cached && cached.expiresAt - refreshBufferMs > Date.now()) {
        return cached.client;
      }
    }

    const pending = pendingClientCache.get(cacheKey);
    if (pending) return pending;

    const requestGeneration = cacheGeneration;
    const request: Promise<OSS> = options
      .loadToken(key)
      .then((token) => {
        if (!token) {
          throw createClientError(FRONTEND_CLIENT_ERROR.OSS_CREDENTIAL_INVALID);
        }
        if (requestGeneration !== cacheGeneration) {
          throw createClientError(FRONTEND_CLIENT_ERROR.AUTH_SESSION_CHANGED);
        }

        const client = createOssClient(token);
        clientCache.set(cacheKey, {
          client,
          expiresAt: resolveExpiresAt(token.expiration, defaultExpiresInMs),
        });
        return client;
      })
      .finally(() => {
        if (pendingClientCache.get(cacheKey) === request) {
          pendingClientCache.delete(cacheKey);
        }
      });
    pendingClientCache.set(cacheKey, request);
    return request;
  };

  const runWithClient = async <Result>(
    key: Key,
    operation: (client: OSS) => Promise<Result>
  ): Promise<Result> => {
    try {
      return await operation(await getClient(key));
    } catch (error) {
      if (isWisePenError(error)) throw error;
      if (!isOssAuthExpiredError(error)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.OSS_OPERATION_FAILED, undefined, error);
      }
      try {
        return await operation(await getClient(key, { forceRefresh: true }));
      } catch (retryError) {
        if (isWisePenError(retryError)) throw retryError;
        throw createClientError(FRONTEND_CLIENT_ERROR.OSS_OPERATION_FAILED, undefined, retryError);
      }
    }
  };

  return {
    getClient,
    runWithClient,
    clear,
  };
};
