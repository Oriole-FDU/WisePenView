import type { ZodType } from 'zod';

import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  FRONTEND_NETWORK_ERROR,
  WisePenError,
} from '@/utils/error';

interface ApiContractContext {
  contract: string;
  endpoint: string;
}

const summarizeIssues = (issues: { path: PropertyKey[]; code: string }[]) =>
  issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: issue.code,
  }));

/** 请求发送前校验前端自己的 API 契约；失败表示 mapper 或调用方产生了非法 payload。 */
export const parseApiRequest = <Output>(
  schema: ZodType<Output>,
  value: unknown,
  context: ApiContractContext
): Output => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw createClientError(
    FRONTEND_CLIENT_ERROR.VALIDATION,
    {
      direction: 'request',
      endpoint: context.endpoint,
      contract: context.contract,
      issues: summarizeIssues(result.error.issues),
    },
    result.error
  );
};

/** 后端响应解包后立即校验消费契约，禁止非法 payload 继续进入 mapper。 */
export const parseApiResponse = <Output>(
  schema: ZodType<Output>,
  value: unknown,
  context: ApiContractContext
): Output => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const issues = summarizeIssues(result.error.issues);
  const issueSummary = issues.map((issue) => `${issue.path}:${issue.code}`).join(', ');
  throw new WisePenError({
    code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
    source: 'http',
    message: `API 响应契约不匹配：${context.contract} (${issueSummary})`,
    meta: {
      direction: 'response',
      endpoint: context.endpoint,
      contract: context.contract,
      issues,
    },
    cause: result.error,
  });
};
