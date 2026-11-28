import { FRONTEND_CLIENT_ERROR } from '@/utils/error/codes';
import { isWisePenError, WisePenError, type WisePenErrorOptions } from '@/utils/error/WisePenError';

const isWisePenErrorOptions = (value: unknown): value is WisePenErrorOptions => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'number' && typeof record.source === 'string';
};

/** 主动创建 WisePenError；只构造，不上报。 */
export function createError(options: WisePenErrorOptions): WisePenError;

/** 规范化未知值：已是 WisePenError 则原样返回，否则包装为 client 错误。 */
export function createError(
  error: unknown,
  defaults?: Omit<WisePenErrorOptions, 'cause'>
): WisePenError;

export function createError(
  input: WisePenErrorOptions | unknown,
  defaults?: Omit<WisePenErrorOptions, 'cause'>
): WisePenError {
  if (isWisePenError(input)) return input;

  if (isWisePenErrorOptions(input) && defaults === undefined) {
    return new WisePenError(input);
  }

  return new WisePenError({
    code: defaults?.code ?? FRONTEND_CLIENT_ERROR.UNKNOWN,
    source: defaults?.source ?? 'client',
    message: defaults?.message,
    serverMsg: defaults?.serverMsg,
    meta: defaults?.meta,
    cause: input,
  });
}
