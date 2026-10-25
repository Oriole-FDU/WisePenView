import type { Attributes } from '@opentelemetry/api';

import { buildInfo } from '@/config/buildInfo';
import type { ErrorReport } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

const pagePaths = Object.values(APP_ROUTE_PATH).sort((a, b) => b.length - a.length);
const errorNames = new Set([
  'Error',
  'TypeError',
  'ReferenceError',
  'RangeError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'AggregateError',
  'WisePenError',
]);
const requestIdPattern = /^(?:[\da-f]{32}|[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12})$/i;
// 只保留本次试点需要的固定端点；其他路径不进入遥测。
const approvedApiPaths = new Set([
  '/auth/login',
  '/resource/item/listResources',
  '/resource/item/renameResource',
  '/resource/tag/getTagTree',
  '/skill/initUploadSkillAssets',
  '/skill/changeSkillInfo',
  '/agent/initUploadAgentAssets',
  '/agent/changeAgentInfo',
  '/agent/updateAgentSpec',
  '/note/saveDrawIOSnapshot',
  '/chat/session/createSession',
  '/chat/completions',
  '/chat/completions/recover',
  '/chat/completions/stream',
  '/chat/completions/active',
]);

export const buildAttributes = {
  'wisepen.release_id': buildInfo.release,
  'wisepen.build_id': buildInfo.buildId,
  'wisepen.git_sha': buildInfo.commit,
  'wisepen.build_dirty': buildInfo.dirty,
};

export const safePagePath = (value: string): string => {
  const pathname = value.split(/[?#]/, 1)[0];
  const exact = pagePaths.find((path) => path === pathname);
  if (exact) return exact;
  const parent = pagePaths.find((path) => path !== '/' && pathname.startsWith(`${path}/`));
  return parent ? `${parent}/:id` : '/:unknown';
};

export const safeApiPath = (pathname: string): string =>
  approvedApiPaths.has(pathname) ? pathname : '/:endpoint';

export const safeNetworkUrl = (value: string): string => {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${safeApiPath(url.pathname)}`;
  } catch {
    return '/:endpoint';
  }
};

/** 只保留当前站点构建 JS 的行列；抛弃异常首行、函数名和 URL 参数。 */
export const safeStackFrames = (stack?: string): string[] => {
  const frames: string[] = [];
  for (const line of (stack ?? '').split('\n')) {
    if (!/^\s*at\s|@https?:\/\//.test(line)) continue;
    const match = line.match(/(https?:\/\/[^\s)]+):(\d+):(\d+)\)?\s*$/);
    if (!match) continue;
    const lineNumber = Number(match[2]);
    const columnNumber = Number(match[3]);
    if (
      !Number.isSafeInteger(lineNumber) ||
      !Number.isSafeInteger(columnNumber) ||
      lineNumber < 1 ||
      columnNumber < 1
    )
      continue;
    try {
      const url = new URL(match[1]);
      if (url.origin !== window.location.origin || !/^\/assets\/[\w.-]+\.m?js$/.test(url.pathname))
        continue;
      frames.push(`${url.pathname.slice(1)}:${lineNumber}:${columnNumber}`);
      if (frames.length === 20) break;
    } catch {
      // 无法解析的帧不作为源代码定位依据。
    }
  }
  return frames;
};

export const safeErrorAttributes = (report: ErrorReport): Attributes => {
  const frames = safeStackFrames(report.error.stack);
  if (!frames.length && report.location) {
    frames.push(
      ...safeStackFrames(
        `at ${report.location.filename}:${report.location.line}:${report.location.column}`
      )
    );
  }
  const type = errorNames.has(report.error.name) ? report.error.name : 'Unknown';
  const page = safePagePath(report.pathname ?? window.location.pathname);
  const attributes: Attributes = {
    ...buildAttributes,
    'error.id': report.id,
    'error.origin': report.origin,
    'error.type': type,
    'error.fingerprint': `${report.operation ?? report.origin}:${type}:${report.error.code ?? report.http?.businessCode ?? report.http?.status ?? ''}:${report.http ? safeApiPath(report.http.pathname) : (frames[0] ?? page)}`,
    'error.location_available': frames.length > 0,
    'page.path': page,
  };
  if (frames.length) attributes['error.stack'] = frames.join('\n');
  if (Number.isSafeInteger(report.error.code)) attributes['error.code'] = report.error.code;
  if (report.error.source) attributes['error.source'] = report.error.source;
  if (report.flow) attributes['error.flow'] = report.flow;
  if (report.operation) attributes['error.operation'] = report.operation;
  if (report.http) {
    attributes['error.source'] = 'http';
    attributes['http.request.method'] = report.http.method;
    attributes['http.response.status_code'] = report.http.status;
    attributes['http.request.resend_count'] = report.http.retryCount;
    attributes['api.endpoint'] = safeApiPath(report.http.pathname);
    if (Number.isSafeInteger(report.http.businessCode)) {
      attributes['api.business_code'] = report.http.businessCode;
    }
    if (report.http.requestId && requestIdPattern.test(report.http.requestId)) {
      attributes['wisepen.request_id'] = report.http.requestId;
    }
  }
  return attributes;
};
