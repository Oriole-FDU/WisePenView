import { app, BrowserWindow, ipcMain, net, protocol, shell, type WebContents } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from '../../src/constants/layoutScale';
import { DESKTOP_CHANNEL } from '../shared/channels';

const APP_SCHEME = 'app';
const APP_HOST = 'wisepen';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const DEV_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const preloadPath = join(currentDirectory, '../preload/index.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function getRendererDistDirectory(): string {
  return join(app.getAppPath(), 'dist');
}

function isFileInsideDirectory(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}${sep}`);
}

function resolveRendererAsset(url: string): string {
  const requestUrl = new URL(url);
  const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
  const rendererDirectory = getRendererDistDirectory();
  const candidate = resolve(rendererDirectory, relativePath);

  if (
    relativePath &&
    isFileInsideDirectory(candidate, rendererDirectory) &&
    existsSync(candidate) &&
    statSync(candidate).isFile()
  ) {
    return candidate;
  }

  return join(rendererDirectory, 'index.html');
}

function isExternalUrl(url: string): boolean {
  try {
    const protocolName = new URL(url).protocol;
    return protocolName === 'https:' || protocolName === 'http:' || protocolName === 'mailto:';
  } catch {
    return false;
  }
}

function isRendererUrl(url: string): boolean {
  if (url.startsWith(`${APP_ORIGIN}/`)) return true;
  return DEV_RENDERER_URL ? url.startsWith(DEV_RENDERER_URL) : false;
}

function protectWindowNavigation(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (isRendererUrl(url)) return;

    event.preventDefault();
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    backgroundColor: '#F8FAFB',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  protectWindowNavigation(window.webContents);

  if (DEV_RENDERER_URL) {
    void window.loadURL(DEV_RENDERER_URL);
  } else {
    void window.loadURL(`${APP_ORIGIN}/`);
  }

  return window;
}

function registerDesktopIpcHandlers(): void {
  ipcMain.handle(DESKTOP_CHANNEL.getAppVersion, () => app.getVersion());
  ipcMain.handle(DESKTOP_CHANNEL.openExternal, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !isExternalUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });
}

app.whenReady().then(() => {
  protocol.handle(APP_SCHEME, (request) => {
    if (new URL(request.url).host !== APP_HOST) {
      return new Response('Not Found', { status: 404 });
    }
    return net.fetch(pathToFileURL(resolveRendererAsset(request.url)).toString());
  });
  registerDesktopIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
