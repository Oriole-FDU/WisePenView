import { installOtelErrorReporter } from './_internal/errorReporter';
import { installAppTelemetry, type TelemetryRouter } from './_internal/lifecycle';

export { loadTelemetryUser } from './_internal/lifecycle';
export { resetTelemetryIdentity } from './_internal/runtime';

/** 应用只安装一个遥测入口，按相反顺序清理监听、聚合和日志出口。 */
export const installTelemetry = (router: TelemetryRouter): (() => void) => {
  const stopReporter = installOtelErrorReporter();
  const stopLifecycle = installAppTelemetry(router);
  return () => {
    stopLifecycle();
    stopReporter();
  };
};
