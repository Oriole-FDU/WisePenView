/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface AppBuildInfo {
  version: string;
  commit: string;
  buildId: string;
  mode: string;
  release: string;
  dirty: boolean;
}

declare const __APP_BUILD_INFO__: Readonly<AppBuildInfo>;

interface ImportMetaEnv {
  // API 地址
  readonly VITE_API_BASE_URL: string;
  // 校内 API 地址（production 才会使用）
  readonly VITE_API_BASE_URL_INTRANET?: string;
  // 开发流量标识
  readonly VITE_X_DEVELOPER?: string;
  // 可选：DrawIO 编辑器入口 URL，未配置时使用官方 embed.diagrams.net
  readonly VITE_DRAWIO_EMBED_URL?: string;
  // ONLYOFFICE Document Server 前端访问地址
  readonly VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL: string;
  // 校内地址探测路径
  readonly VITE_INTRANET_PING_PATH?: string;
  // 校内地址探测超时（毫秒）
  readonly VITE_NETWORK_PROBE_TIMEOUT?: string;
  // 可选：OTLP HTTP 入口，未配置时禁用前端 OTel
  readonly VITE_OTEL_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
