import type { Attributes, Context, Span } from '@opentelemetry/api';

import { TELEMETRY_OWNER_CONTEXT_KEY } from './context';
import type { TelemetrySnapshot } from './model';
import { captureTelemetryContext } from './runtime';
import { sanitizeDiagnosticText } from './sanitize';

/** 自动 HTTP span 优先继承请求现场，跨账号后的重试仍归属发起时的账号。 */
export class TelemetrySpanProcessor {
  onStart(span: Span & { readonly attributes: Attributes }, parentContext: Context): void {
    try {
      if (!span.attributes['session.id']) {
        const snapshot =
          (parentContext.getValue(TELEMETRY_OWNER_CONTEXT_KEY) as TelemetrySnapshot | undefined) ??
          captureTelemetryContext();
        if (snapshot) span.setAttributes(snapshot.attributes);
      }
      for (const key of ['url.full', 'http.url']) {
        const url = span.attributes[key];
        if (typeof url === 'string') span.setAttribute(key, sanitizeDiagnosticText(url, 512));
      }
    } catch {
      // 同步处理器不得把诊断失败传回发起网络请求的业务代码。
    }
  }

  onEnd(): void {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
