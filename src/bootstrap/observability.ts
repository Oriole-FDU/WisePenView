/**
 * 应用启动阶段的 observability 装配。
 *
 * 只传入路由实例并启动安装流程，具体 SDK 和监听器由 observability 模块管理。
 */
import { installObservability } from '@/observability/install';

import router from './router';

export const startAppObservability = (): (() => void) =>
  installObservability({
    router,
  });
