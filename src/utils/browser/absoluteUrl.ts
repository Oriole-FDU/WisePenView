/** 将应用内路径补全为可分享的绝对地址，用于邀请链接等需要整段复制的场景 */
export function buildAbsoluteAppUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
