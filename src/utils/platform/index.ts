/**
 * 运行环境 / OS 检测。
 * 桌面优先读 preload 注入的 `window.desktop.platform`；浏览器再回退 UA。
 */

export const DESKTOP_OS = {
  MACOS: 'macos',
  WINDOWS: 'windows',
  LINUX: 'linux',
  UNKNOWN: 'unknown',
} as const;

export type DesktopOs = (typeof DESKTOP_OS)[keyof typeof DESKTOP_OS];

const NODE_PLATFORM_TO_OS: Record<string, DesktopOs> = {
  darwin: DESKTOP_OS.MACOS,
  win32: DESKTOP_OS.WINDOWS,
  linux: DESKTOP_OS.LINUX,
};

/** 是否在 Electron 渲染进程（preload 已注入 desktop bridge） */
export const isDesktop = (): boolean =>
  typeof window !== 'undefined' && typeof window.desktop !== 'undefined';

const detectOsFromUserAgent = (): DesktopOs => {
  if (typeof navigator === 'undefined') return DESKTOP_OS.UNKNOWN;

  const platformHint =
    // Chromium：比已弃用的 navigator.platform 更稳
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.userAgent;

  const hint = platformHint.toLowerCase();
  if (hint.includes('mac')) return DESKTOP_OS.MACOS;
  if (hint.includes('win')) return DESKTOP_OS.WINDOWS;
  if (hint.includes('linux') || hint.includes('x11')) return DESKTOP_OS.LINUX;
  return DESKTOP_OS.UNKNOWN;
};

export const getDesktopOs = (): DesktopOs => {
  if (typeof window !== 'undefined') {
    const injected = window.desktop?.platform;
    if (injected && NODE_PLATFORM_TO_OS[injected]) {
      return NODE_PLATFORM_TO_OS[injected];
    }
  }
  return detectOsFromUserAgent();
};

export const isMac = (): boolean => getDesktopOs() === DESKTOP_OS.MACOS;
export const isWindows = (): boolean => getDesktopOs() === DESKTOP_OS.WINDOWS;
export const isLinux = (): boolean => getDesktopOs() === DESKTOP_OS.LINUX;

/** 修饰键文案：Mac → ⌘，其余 → Ctrl */
export const getModKeyLabel = (): '⌘' | 'Ctrl' => (isMac() ? '⌘' : 'Ctrl');
