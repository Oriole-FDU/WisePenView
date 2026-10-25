/** 诊断文本只保留有限长度，移除 URL 参数、认证令牌和邮箱。 */
export const sanitizeDiagnosticText = (value: string, limit = 512): string =>
  value
    .replace(/https?:\/\/[^\s)]+/g, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .slice(0, limit);

/** 只保留路径；请求参数、锚点和 URL 中的凭据不进入遥测。 */
export const readRequestPath = (url: string, baseUrl?: string): string => {
  try {
    return new URL(url, baseUrl || 'https://telemetry.invalid').pathname.slice(0, 256);
  } catch {
    return '/invalid-url';
  }
};
