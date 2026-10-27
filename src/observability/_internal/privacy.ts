const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+\S+/gi;
const URL_PATTERN = /https?:\/\/[^\s)]+/g;

export const sanitizeDiagnosticText = (value: string, limit = 512): string =>
  value
    .replace(URL_PATTERN, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(EMAIL_PATTERN, '[email]')
    .slice(0, limit);

export const sanitizePath = (value: string, limit = 256): string => {
  try {
    return new URL(value, 'https://observability.invalid').pathname.slice(0, limit);
  } catch {
    return '/invalid-url';
  }
};

export const getFirstStackFrame = (stack?: string): string => {
  if (!stack) return '';
  return (
    stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
};

export const buildErrorFingerprint = (type: string, message: string, stack?: string): string =>
  `${type}:${message}:${getFirstStackFrame(stack)}`.slice(0, 512);

export const isValidExceptionLocation = (
  location: ExceptionLocationCandidate | undefined
): location is ExceptionLocationCandidate =>
  Boolean(
    location &&
    location.filename.trim() &&
    Number.isSafeInteger(location.line) &&
    location.line > 0 &&
    Number.isSafeInteger(location.column) &&
    location.column > 0
  );

interface ExceptionLocationCandidate {
  filename: string;
  line: number;
  column: number;
}
