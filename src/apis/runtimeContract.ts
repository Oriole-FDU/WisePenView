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
