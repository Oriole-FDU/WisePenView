import { contextBridge, ipcRenderer } from 'electron';
import { DESKTOP_CHANNEL } from '../shared/channels';

const nodePlatform = process.platform;
const platform =
  nodePlatform === 'darwin' || nodePlatform === 'win32' || nodePlatform === 'linux'
    ? nodePlatform
    : 'linux';

const desktopBridge = Object.freeze({
  platform,
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(DESKTOP_CHANNEL.getAppVersion),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(DESKTOP_CHANNEL.openExternal, url),
});

contextBridge.exposeInMainWorld('desktop', desktopBridge);
