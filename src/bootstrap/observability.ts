import { applyXhrApiAttributes } from '@/apis/_internal/xhrApiTelemetry';
import { publicAppConfig } from '@/config/runtimeConfig';
import { installObservability } from '@/observability';

import router from './router';

const apiOrigins = new Set(
  [publicAppConfig.api.baseUrl, publicAppConfig.api.intranetBaseUrl]
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value).origin)
);

export const startAppObservability = () =>
  installObservability({
    router,
    applyXhrApiAttributes: (span, xhr) => applyXhrApiAttributes(span, xhr, apiOrigins),
  });
