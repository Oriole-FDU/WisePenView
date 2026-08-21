import { isRecord } from '@/utils/typeGuards';

export interface ParsedApiErrorBody {
  code?: number;
  message?: string;
}

const readMessage = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.trim() || undefined;
};

/** 将各后端与基础设施错误体归一为前端可消费的错误字段。 */
export const parseApiErrorBody = (data: unknown): ParsedApiErrorBody | undefined => {
  if (typeof data === 'string') {
    const message = readMessage(data);
    return message ? { message } : undefined;
  }

  if (!isRecord(data)) return undefined;

  const code = typeof data.code === 'number' ? data.code : undefined;
  const message =
    readMessage(data.error_msg) ??
    readMessage(data.msg) ??
    readMessage(data.message) ??
    readMessage(data.detail);

  if (code === undefined && message === undefined) return undefined;
  return { code, message };
};
