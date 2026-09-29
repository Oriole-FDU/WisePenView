import { createPublicAppConfig } from './publicConfig';

export const publicAppConfig = createPublicAppConfig({
  MODE: import.meta.env.MODE,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_BASE_URL_INTRANET: import.meta.env.VITE_API_BASE_URL_INTRANET,
  VITE_INTRANET_PING_PATH: import.meta.env.VITE_INTRANET_PING_PATH,
  VITE_NETWORK_PROBE_TIMEOUT: import.meta.env.VITE_NETWORK_PROBE_TIMEOUT,
  VITE_X_DEVELOPER: import.meta.env.VITE_X_DEVELOPER,
  VITE_DRAWIO_EMBED_URL: import.meta.env.VITE_DRAWIO_EMBED_URL,
  VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL: import.meta.env
    .VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL,
});
