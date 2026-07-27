import { isRouteErrorResponse } from 'react-router-dom';

import i18n from '@/i18n';
import { isWisePenError } from '@/utils/error';

const detailLabel = (key: string): string => i18n.t(`detail.${key}`, { ns: 'errors' });

const getStackLocation = (stack: string | undefined): string | undefined => {
  if (!stack) {
    return undefined;
  }

  const frame = stack
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .find(Boolean);

  if (!frame) {
    return undefined;
  }

  return frame.replace(/https?:\/\/[^/]+\//g, '').replace(/^at\s+/, '');
};

const serializeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(
      value,
      (_key, nestedValue: unknown) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            stack: nestedValue.stack,
          };
        }

        if (typeof nestedValue === 'object' && nestedValue !== null) {
          if (seen.has(nestedValue)) {
            return '[Circular]';
          }
          seen.add(nestedValue);
        }

        return nestedValue;
      },
      2
    );
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
};

const appendError = (
  lines: string[],
  error: Error,
  heading?: string,
  seenErrors = new WeakSet<Error>()
) => {
  if (heading) {
    lines.push('', `${heading}:`);
  }

  if (seenErrors.has(error)) {
    lines.push('[Circular Error]');
    return;
  }
  seenErrors.add(error);

  lines.push(
    `${detailLabel('type')}: ${error.name || 'Error'}`,
    `${detailLabel('message')}: ${error.message}`
  );

  const stackLocation = getStackLocation(error.stack);
  if (stackLocation) {
    lines.push(`${detailLabel('location')}: ${stackLocation}`);
  }

  if (isWisePenError(error)) {
    lines.push(
      `${detailLabel('code')}: ${error.code}`,
      `${detailLabel('source')}: ${error.source}`
    );

    if (error.serverMsg && error.serverMsg !== error.message) {
      lines.push(`${detailLabel('serverMessage')}: ${error.serverMsg}`);
    }

    if (error.meta) {
      lines.push(`${detailLabel('metadata')}: ${serializeValue(error.meta)}`);
    }
  }

  if (error.stack) {
    lines.push('', `${detailLabel('stack')}:`, error.stack);
  }

  if (error.cause instanceof Error) {
    appendError(lines, error.cause, detailLabel('cause'), seenErrors);
  } else if (error.cause !== undefined) {
    lines.push('', `${detailLabel('cause')}:`, serializeValue(error.cause));
  }
};

export const buildErrorDetail = (error: unknown, pathname: string, errorId: string): string => {
  const lines = [`${detailLabel('errorId')}: ${errorId}`, `${detailLabel('page')}: ${pathname}`];

  if (isRouteErrorResponse(error)) {
    lines.push(
      `${detailLabel('type')}: RouteErrorResponse`,
      `${detailLabel('httpStatus')}: ${error.status}${error.statusText ? ` ${error.statusText}` : ''}`
    );

    if (!import.meta.env.DEV) return lines.join('\n');

    if (error.data instanceof Error) {
      appendError(lines, error.data, detailLabel('responseError'));
    } else if (error.data !== undefined) {
      lines.push(`${detailLabel('responseData')}: ${serializeValue(error.data)}`);
    }

    return lines.join('\n');
  }

  if (error instanceof Error) {
    if (!import.meta.env.DEV) {
      lines.push(`${detailLabel('type')}: ${error.name || 'Error'}`);
      if (isWisePenError(error)) {
        lines.push(
          `${detailLabel('code')}: ${error.code}`,
          `${detailLabel('source')}: ${error.source}`
        );
      }
      return lines.join('\n');
    }
    appendError(lines, error);
    return lines.join('\n');
  }

  lines.push(`${detailLabel('type')}: Unknown`);
  if (import.meta.env.DEV) {
    lines.push(`${detailLabel('content')}: ${serializeValue(error)}`);
  }
  return lines.join('\n');
};
