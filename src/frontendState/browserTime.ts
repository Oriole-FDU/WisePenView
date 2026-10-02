import { formatTimestampToDateTime } from '@/utils/format';

/** 浏览器当前时间上下文 */
export interface BrowserTimeContext {
  /** 带本地时区偏移的 ISO 8601 时间，例如 2026-09-21T15:04:05+08:00 */
  iso: string;
  /** 本地日期时间，例如 2026-09-21 15:04:05 */
  local: string;
  /** IANA 时区，例如 Asia/Shanghai */
  timezone: string;
}

/** Date → 本地时区相对 UTC 的偏移，例如 +08:00 */
function formatUtcOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/** 读取浏览器当前时间上下文：本地时间与本地时区，默认取调用时刻 */
export function readBrowserTimeContext(now: Date = new Date()): BrowserTimeContext {
  const local = formatTimestampToDateTime(now);
  return {
    iso: `${local.replace(' ', 'T')}${formatUtcOffset(now)}`,
    local,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
