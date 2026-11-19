import { createDomainError } from '@/utils/error/createDomainError';

/**
 * @deprecated 请改用 createDomainError 或 createComponentError。
 * 暂保留为 createDomainError 的别名，避免迁移中断。
 */
export const createClientError = createDomainError;
