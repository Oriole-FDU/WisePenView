/** Node `process.platform` 子集，由 preload 同步注入 */
type DesktopNodePlatform = 'darwin' | 'win32' | 'linux';

interface DesktopBridge {
  /** Node process.platform（同步可读，供快捷键文案等） */
  readonly platform: DesktopNodePlatform;
  getAppVersion(): Promise<string>;
  openExternal(url: string): Promise<boolean>;
}

interface Window {
  readonly desktop?: DesktopBridge;
}
