export type AppMode = 'development' | 'mock' | 'production';

export interface PublicAppEnv {
  MODE?: string;
  VITE_API_BASE_URL?: string;
  VITE_API_BASE_URL_INTRANET?: string;
  VITE_INTRANET_PING_PATH?: string;
  VITE_NETWORK_PROBE_TIMEOUT?: string;
  VITE_X_DEVELOPER?: string;
  VITE_DRAWIO_EMBED_URL?: string;
  VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL?: string;
}

export interface PublicAppConfig {
  mode: AppMode;
  api: {
    baseUrl: string;
    intranetBaseUrl?: string;
    intranetPingPath?: string;
    networkProbeTimeoutMs: number;
    switchByNetwork: boolean;
  };
  office: {
    documentServerUrl: string;
  };
  drawio: {
    embedUrl: string;
  };
  developerHeader: string;
}

export class PublicConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicConfigError';
  }
}

const DEFAULT_DRAWIO_EMBED_URL = 'https://embed.diagrams.net/';
const DEFAULT_NETWORK_PROBE_TIMEOUT_MS = 1_000;

const normalizeMode = (mode: string | undefined): AppMode => {
  if (mode === 'mock') return 'mock';
  if (mode === 'production') return 'production';
  return 'development';
};

const requireValue = (key: string, value: string | undefined): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new PublicConfigError(`[config] 缺少 ${key}。请检查当前环境配置。`);
  }
  return normalized;
};

const parsePublicUrl = (
  key: string,
  value: string | undefined,
  options: { allowTrailingSlash: boolean }
): string => {
  const normalized = requireValue(key, value);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new PublicConfigError(`[config] ${key} 必须是绝对 URL。`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new PublicConfigError(`[config] ${key} 只支持 http 或 https URL。`);
  }
  if (!options.allowTrailingSlash && normalized.endsWith('/')) {
    throw new PublicConfigError(`[config] ${key} 不能以 / 结尾。`);
  }
  return normalized;
};

const parsePingPath = (value: string | undefined): string => {
  const normalized = requireValue('VITE_INTRANET_PING_PATH', value);
  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    throw new PublicConfigError('[config] VITE_INTRANET_PING_PATH 必须是站内相对路径。');
  }
  return normalized;
};

const parseProbeTimeout = (value: string | undefined): number => {
  const normalized = requireValue('VITE_NETWORK_PROBE_TIMEOUT', value);

  const timeout = Number(normalized);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new PublicConfigError('[config] VITE_NETWORK_PROBE_TIMEOUT 必须是正数。');
  }
  return timeout;
};

export function createPublicAppConfig(env: PublicAppEnv): PublicAppConfig {
  const mode = normalizeMode(env.MODE);
  const baseUrl = parsePublicUrl('VITE_API_BASE_URL', env.VITE_API_BASE_URL, {
    allowTrailingSlash: false,
  });
  const documentServerUrl = parsePublicUrl(
    'VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL',
    env.VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL,
    { allowTrailingSlash: true }
  );
  const drawioEmbedUrl = env.VITE_DRAWIO_EMBED_URL
    ? parsePublicUrl('VITE_DRAWIO_EMBED_URL', env.VITE_DRAWIO_EMBED_URL, {
        allowTrailingSlash: true,
      })
    : DEFAULT_DRAWIO_EMBED_URL;

  if (mode !== 'production') {
    return {
      mode,
      api: {
        baseUrl,
        networkProbeTimeoutMs: DEFAULT_NETWORK_PROBE_TIMEOUT_MS,
        switchByNetwork: false,
      },
      office: { documentServerUrl },
      drawio: { embedUrl: drawioEmbedUrl },
      developerHeader: env.VITE_X_DEVELOPER?.trim() ?? '',
    };
  }

  return {
    mode,
    api: {
      baseUrl,
      intranetBaseUrl: parsePublicUrl(
        'VITE_API_BASE_URL_INTRANET',
        env.VITE_API_BASE_URL_INTRANET,
        { allowTrailingSlash: false }
      ),
      intranetPingPath: parsePingPath(env.VITE_INTRANET_PING_PATH),
      networkProbeTimeoutMs: parseProbeTimeout(env.VITE_NETWORK_PROBE_TIMEOUT),
      switchByNetwork: true,
    },
    office: { documentServerUrl },
    drawio: { embedUrl: drawioEmbedUrl },
    developerHeader: '',
  };
}
