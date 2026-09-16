/**
 * 服务注册入口：
 * - 类型定义统一来自 registry.types.ts
 * - 具体实现由别名 @services-registry 在构建阶段注入（impl 或 mock）
 */
export type { ServicesContextValue } from './registry.types';
export { getContextValue } from '@services-registry';
