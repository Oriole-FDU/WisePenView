import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

import type { ApiResponse } from './api.type';

/** 运行期只确认统一响应 envelope；data 的领域形状由 API DTO 与 mapper 分层处理。 */
export const isApiResponseEnvelope = (value: unknown): value is ApiResponse<unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  if (typeof record.code !== 'number' || !Number.isFinite(record.code) || !('data' in record)) {
    return false;
  }

  if ('key' in record) {
    return (
      (record.key === null || typeof record.key === 'string') &&
      (record.msg === null || typeof record.msg === 'string')
    );
  }

  return typeof record.msg === 'string';
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const invalidApiResponse = (message = 'API 响应契约无效'): never => {
  throw new WisePenError({
    code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
    source: 'api',
    message,
  });
};

export const assertApiRecord = (
  value: unknown,
  message = 'API 响应契约无效'
): Record<string, unknown> => {
  if (!isRecord(value)) invalidApiResponse(message);
  return value as Record<string, unknown>;
};

export const assertApiArray = <T = unknown>(
  value: unknown,
  predicate: (item: unknown) => item is T,
  message = 'API 响应契约无效'
): T[] => {
  if (!Array.isArray(value) || !value.every(predicate)) invalidApiResponse(message);
  return value as T[];
};

export const assertApiPage = <T = unknown>(
  value: unknown,
  predicate: (item: unknown) => item is T,
  message = 'API 分页响应契约无效'
): { list: T[]; total: number; page: number; size: number; totalPage: number } => {
  const record = assertApiRecord(value, message);
  const integer = (item: unknown): number => {
    if (!isFiniteNumber(item) || !Number.isSafeInteger(item)) invalidApiResponse(message);
    return item as number;
  };
  const total = integer(record.total);
  const page = integer(record.page);
  const size = integer(record.size);
  const totalPage = integer(record.totalPage);
  if (
    !Array.isArray(record.list) ||
    !record.list.every(predicate) ||
    record.list.length > Number(record.size) ||
    total < 0 ||
    page < 1 ||
    size < 1 ||
    totalPage < 0 ||
    totalPage !== Math.ceil(total / size) ||
    (total === 0 ? page !== 1 : page > totalPage)
  ) {
    invalidApiResponse(message);
  }
  return record as {
    list: T[];
    total: number;
    page: number;
    size: number;
    totalPage: number;
  };
};

export const isApiId = (value: unknown): value is string | number =>
  (typeof value === 'string' && value.trim().length > 0) ||
  (typeof value === 'number' && Number.isSafeInteger(value));

export const optionalApiString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const optionalApiNumber = (value: unknown): number | undefined =>
  isFiniteNumber(value) ? value : undefined;

export const optionalApiBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export const optionalApiStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
