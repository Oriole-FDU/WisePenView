/**
 * 遥测数据进入 OTel 前的统一隐私处理。
 *
 * 负责 URL、本机路径、Bearer Token、邮箱和诊断字段长度限制。
 */
import type { ExceptionLocation } from './types';

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+\S+/gi;
const HTTP_URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const FILE_URL_PATTERN = /\bfile:\/\/[^\s)]*/gi;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;
const LOCAL_PATH_PATTERN =
  /(^|[\s("'=])(?:[A-Za-z]:\\[^\s)]*|\/(?:Users|home|private|var|tmp)\/[^\s)]*)/g;

const sanitizeHttpUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[url]';
  }
};

/** 清理诊断文本中的 URL query、本机路径和常见凭据。 */
export const sanitizeDiagnosticText = (value: string, limit = 512): string =>
  value
    .replace(FILE_URL_PATTERN, '[local-path]')
    .replace(HTTP_URL_PATTERN, sanitizeHttpUrl)
    .replace(LOCAL_PATH_PATTERN, '$1[local-path]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(EMAIL_PATTERN, '[email]')
    .slice(0, limit);

/** 将请求 URL 收敛为 origin + path，供自动 fetch/XHR span 使用。 */
export const sanitizeRequestUrl = (value: string, limit = 2_048): string => {
  try {
    const base =
      typeof window === 'undefined' ? 'https://observability.invalid' : window.location.origin;
    const url = new URL(value, base);
    if (url.protocol === 'file:') return '[local-path]';
    return `${url.origin}${url.pathname}`.slice(0, limit);
  } catch {
    return '[invalid-url]';
  }
};

export const sanitizePath = (value: string, limit = 256): string => {
  try {
    const url = new URL(value, 'https://observability.invalid');
    return url.pathname.slice(0, limit);
  } catch {
    return '/invalid-url';
  }
};

export const normalizeApiEndpoint = (path: string): string =>
  path.replace(UUID_PATTERN, ':id').replace(NUMERIC_SEGMENT_PATTERN, '/:id');

export const getFirstStackFrame = (stack?: string): string => {
  if (!stack) return '';
  const [first = '', second = ''] = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return /^\s*at\s/.test(first) ? first : second;
};

export const buildErrorFingerprint = (type: string, message: string, stack?: string): string =>
  `${type}:${message}:${getFirstStackFrame(stack)}`.slice(0, 512);

export const isValidExceptionLocation = (
  location: ExceptionLocation | undefined
): location is ExceptionLocation =>
  Boolean(
    location &&
    location.filename.trim() &&
    Number.isSafeInteger(location.line) &&
    location.line > 0 &&
    Number.isSafeInteger(location.column) &&
    location.column > 0
  );

export const isValidRequestId = (value: string): boolean => /^[\w.:-]{1,128}$/.test(value);
