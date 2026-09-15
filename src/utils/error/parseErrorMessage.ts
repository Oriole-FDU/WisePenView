import { parseApiErrorBody, type ParsedApiErrorBody } from '@/apis/apiError';
import i18n from '@/i18n';
import { I18N_NAMESPACES } from '@/i18n/resources';
import { isWisePenError } from '@/utils/error/WisePenError';
import type { AxiosError } from 'axios';

const readAxiosErrorBody = (err: unknown): ParsedApiErrorBody | undefined => {
  const axiosErr = err as AxiosError<unknown>;
  if (!axiosErr?.response) return undefined;
  return parseApiErrorBody(axiosErr.response.data);
};

const extractErrorCode = (err: unknown): number | undefined => {
  if (isWisePenError(err)) return err.code;
  return readAxiosErrorBody(err)?.code;
};

const extractErrorMeta = (err: unknown): Record<string, unknown> | undefined => {
  if (isWisePenError(err)) return err.meta;
  return undefined;
};

/**
 * WisePenError 的 message 仅作诊断兜底，无后端文案时会形如 `Error 1001`，
 * 因此用户可见文案只取 serverMsg，避免把内部错误码直接展示给用户。
 */
const extractServerMsg = (err: unknown): string | undefined => {
  if (isWisePenError(err)) return err.serverMsg;
  const serverMsg = readAxiosErrorBody(err)?.message;
  if (serverMsg) return serverMsg;
  if (err instanceof Error && err.message) return err.message;
  return undefined;
};

const translateByCode = (code: number, meta?: Record<string, unknown>): string | undefined => {
  const key = `code.${code}`;
  const translated = i18n.t(key, { ns: I18N_NAMESPACES.ERRORS, ...meta });
  if (translated === key || translated === `${I18N_NAMESPACES.ERRORS}:${key}`) {
    return undefined;
  }
  return translated;
};

/** 从 err 解析出提示文案：i18n(code) → serverMsg → unknown */
export const parseErrorMessage = (err: unknown): string => {
  const code = extractErrorCode(err);
  if (code !== undefined) {
    const i18nMsg = translateByCode(code, extractErrorMeta(err));
    if (i18nMsg) return i18nMsg;
  }

  const serverMsg = extractServerMsg(err);
  if (serverMsg) return serverMsg;

  return i18n.t('common.unknown', { ns: I18N_NAMESPACES.ERRORS });
};
