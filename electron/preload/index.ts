import { contextBridge, ipcRenderer } from 'electron';

import { DESKTOP_CHANNEL, type DesktopNavigationState } from '../shared/channels';

const nodePlatform = process.platform;
const platform =
  nodePlatform === 'darwin' || nodePlatform === 'win32' || nodePlatform === 'linux'
    ? nodePlatform
    : 'linux';
let fullScreen = false;
let maximized = false;
const fullScreenListeners = new Set<(value: boolean) => void>();
const maximizedListeners = new Set<(value: boolean) => void>();
const navigationStateListeners = new Set<() => void>();
let navigationState: DesktopNavigationState = { canGoBack: false, canGoForward: false };

const isNavigationState = (value: unknown): value is DesktopNavigationState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<DesktopNavigationState>;
  return typeof state.canGoBack === 'boolean' && typeof state.canGoForward === 'boolean';
};

ipcRenderer.on(DESKTOP_CHANNEL.fullScreenChanged, (_event, value: unknown) => {
  if (typeof value !== 'boolean') return;
  fullScreen = value;
  fullScreenListeners.forEach((listener) => listener(value));
});

ipcRenderer.on(DESKTOP_CHANNEL.maximizedChanged, (_event, value: unknown) => {
  if (typeof value !== 'boolean') return;
  maximized = value;
  maximizedListeners.forEach((listener) => listener(value));
});

ipcRenderer.on(DESKTOP_CHANNEL.navigationStateChanged, (_event, value: unknown) => {
  if (!isNavigationState(value)) return;
  navigationState = value;
  navigationStateListeners.forEach((listener) => listener());
});

const desktopBridge = Object.freeze({
  platform,
  isFullScreen: (): boolean => fullScreen,
  onFullScreenChange: (listener: (value: boolean) => void): (() => void) => {
    fullScreenListeners.add(listener);
    return () => fullScreenListeners.delete(listener);
  },
  isMaximized: (): boolean => maximized,
  onMaximizedChange: (listener: (value: boolean) => void): (() => void) => {
    maximizedListeners.add(listener);
    return () => maximizedListeners.delete(listener);
  },
  getNavigationState: (): DesktopNavigationState => navigationState,
  onNavigationStateChange: (listener: () => void): (() => void) => {
    navigationStateListeners.add(listener);
    return () => navigationStateListeners.delete(listener);
  },
  navigationBack: (): Promise<boolean> => ipcRenderer.invoke(DESKTOP_CHANNEL.navigationBack),
  navigationForward: (): Promise<boolean> => ipcRenderer.invoke(DESKTOP_CHANNEL.navigationForward),
  setColorScheme: (scheme: string): Promise<void> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.setColorScheme, scheme),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(DESKTOP_CHANNEL.getAppVersion),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.openExternal, url),
  windowMinimize: (): Promise<void> => ipcRenderer.invoke(DESKTOP_CHANNEL.windowMinimize),
  windowMaximizeToggle: (): Promise<void> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.windowMaximizeToggle),
  windowClose: (): Promise<void> => ipcRenderer.invoke(DESKTOP_CHANNEL.windowClose),
  savePdfFromHtml: (options: { html: string; defaultFileName: string }): Promise<string | null> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.savePdfFromHtml, options),
});

contextBridge.exposeInMainWorld('desktop', desktopBridge);
