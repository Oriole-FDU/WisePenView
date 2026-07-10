/// <reference types="vite/client" />

interface ImportMetaEnv {
  // dev / mock 模式（单一 host[:port]）
  readonly VITE_API_SERVER_ADDR: string;
  readonly VITE_DEV_API_PROXY_TARGET?: string;
  readonly VITE_DEV_NOTE_COLLAB_PROXY_TARGET?: string;
  readonly VITE_NOTE_COLLAB_WS_ADDR?: string;
  // dev 模式下可选：非空时请求头自动附带 x-developer
  readonly VITE_X_DEVELOPER: string;
  // 可选：DrawIO 编辑器入口 URL，未配置时使用官方 embed.diagrams.net
  readonly VITE_DRAWIO_EMBED_URL?: string;
  // 可选：ONLYOFFICE Document Server 前端访问地址，未配置时使用当前服务器的 8101 端口
  readonly VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL?: string;
  // production 模式（双 host[:port] + ping 探针路径 + 探测超时）
  readonly VITE_API_SERVER_ADDR_INTRANET: string;
  readonly VITE_API_SERVER_ADDR_EXTRANET: string;
  readonly VITE_INTRANET_PING_PATH: string;
  readonly VITE_NETWORK_PROBE_TIMEOUT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
