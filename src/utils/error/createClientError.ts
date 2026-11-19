import type { FrontendDomainErrorCode } from '@/utils/error/codes';
import { createDomainError } from '@/utils/error/createDomainError';
import type { WisePenError } from '@/utils/error/WisePenError';

/**
 * @deprecated 请改用 createDomainError 或 createComponentError。
 * 暂保留为 createDomainError 的别名，避免迁移中断。
 */
export const createClientError = (
  code?: FrontendDomainErrorCode,
  meta?: Record<string, unknown>,
  cause?: unknown
): WisePenError => createDomainError(code, meta, cause);
