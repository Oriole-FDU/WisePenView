import { existsSync, promises as fs, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  net,
  protocol,
  shell,
  type WebContents,
} from 'electron';

import {
  DESKTOP_MAC_TRAFFIC_LIGHT_POSITION,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from '../../src/constants/layoutScale';
import { COLOR_SCHEME, type ColorScheme, DEFAULT_COLOR_SCHEME } from '../../src/theme/constants';
import { APP_ROUTE_PATH, isAuthenticatedAppRoutePath } from '../../src/utils/navigation/appRoute';
import { DESKTOP_CHANNEL, type DesktopNavigationState } from '../shared/channels';

const APP_SCHEME = 'app';
const APP_HOST = 'wisepen';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const DEV_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const preloadPath = join(currentDirectory, '../preload/index.cjs');
const PDF_EXPORT_TIMEOUT_MS = 30_000;
const DESKTOP_ICON_DIRECTORY = join('electron', 'assets', 'app-icons');
const DESKTOP_ICON_FILENAMES: Record<ColorScheme, string> = {
  default: 'default.png',
  floral: 'floral.png',
  aqua: 'aqua.png',
  sunset: 'sunset.png',
  emerald: 'emerald.png',
  lavender: 'lavender.png',
};
const COLOR_SCHEME_VALUES = new Set<ColorScheme>(Object.values(COLOR_SCHEME));

let currentColorScheme: ColorScheme = DEFAULT_COLOR_SCHEME;

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

function isColorScheme(value: unknown): value is ColorScheme {
  return typeof value === 'string' && COLOR_SCHEME_VALUES.has(value as ColorScheme);
}

function getDesktopIconPath(colorScheme: ColorScheme): string {
  return join(app.getAppPath(), DESKTOP_ICON_DIRECTORY, DESKTOP_ICON_FILENAMES[colorScheme]);
}

function loadDesktopIcon(colorScheme: ColorScheme) {
  const iconPath = getDesktopIconPath(colorScheme);
  const fallbackPath = getDesktopIconPath(DEFAULT_COLOR_SCHEME);
  return nativeImage.createFromPath(existsSync(iconPath) ? iconPath : fallbackPath);
}

function applyDesktopIcon(colorScheme: ColorScheme): void {
  currentColorScheme = colorScheme;
  const desktopIcon = loadDesktopIcon(colorScheme);
  if (desktopIcon.isEmpty()) return;

  if (process.platform === 'darwin') {
    app.dock?.setIcon(desktopIcon);
  }

  for (const window of BrowserWindow.getAllWindows()) {
    window.setIcon(desktopIcon);
  }
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

function isAppRouteUrl(url: string): boolean {
  if (!isRendererUrl(url)) return false;
  try {
    const parsedUrl = new URL(url);
    return isAuthenticatedAppRoutePath(parsedUrl.pathname);
  } catch {
    return false;
  }
}

function getAppNavigationState(contents: WebContents): DesktopNavigationState {
  const history = contents.navigationHistory;
  const entries = history.getAllEntries();
  const activeIndex = history.getActiveIndex();
  const previousEntry = entries[activeIndex - 1];
  const nextEntry = entries[activeIndex + 1];

  return {
    canGoBack: history.canGoBack() && Boolean(previousEntry && isAppRouteUrl(previousEntry.url)),
    canGoForward: history.canGoForward() && Boolean(nextEntry && isAppRouteUrl(nextEntry.url)),
  };
}

function sendAppNavigationState(contents: WebContents): void {
  if (contents.isDestroyed()) return;
  contents.send(DESKTOP_CHANNEL.navigationStateChanged, getAppNavigationState(contents));
}

function buildRendererEntryUrl(): string {
  const baseUrl = DEV_RENDERER_URL ?? APP_ORIGIN;
  return new URL(APP_ROUTE_PATH.HOME, baseUrl).toString();
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

function normalizePdfDefaultName(value: unknown): string {
  if (typeof value !== 'string') return '笔记.pdf';
  const trimmed = value.trim();
  if (!trimmed) return '笔记.pdf';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

function waitForWebContentsReady(contents: WebContents): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('PDF 导出页面加载超时'));
    }, PDF_EXPORT_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      contents.off('did-finish-load', handleReady);
      contents.off('did-fail-load', handleFail);
    };

    const handleReady = () => {
      cleanup();
      resolve();
    };
    const handleFail = (_event: unknown, _code: number, description: string) => {
      cleanup();
      reject(new Error(description || 'PDF 导出页面加载失败'));
    };

    contents.once('did-finish-load', handleReady);
    contents.once('did-fail-load', handleFail);
  });
}

async function savePdfFromHtml(
  parent: BrowserWindow | null,
  html: string,
  defaultFileName: string
) {
  const saveDialogOptions = {
    title: '导出 PDF',
    defaultPath: normalizePdfDefaultName(defaultFileName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  };
  const { canceled, filePath } = parent
    ? await dialog.showSaveDialog(parent, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);
  if (canceled || !filePath) return null;

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  try {
    const ready = waitForWebContentsReady(pdfWindow.webContents);
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await ready;
    await pdfWindow.webContents.executeJavaScript(
      `Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        Promise.all(Array.from(document.images).map((image) => image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
              setTimeout(resolve, 5000);
            })))
      ]).then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))`
    );
    const pdf = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
    await fs.writeFile(filePath, pdf);
    return filePath;
  } finally {
    pdfWindow.destroy();
  }
}

function createMainWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';
  const window = new BrowserWindow({
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    icon: getDesktopIconPath(currentColorScheme),
    backgroundColor: '#F8FAFB',
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { ...DESKTOP_MAC_TRAFFIC_LIGHT_POSITION },
        }
      : {
          // Win/Linux：藏系统标题条；窗口按钮由渲染层自绘（与 header 按钮同风格）。
          titleBarStyle: 'hidden' as const,
        }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  protectWindowNavigation(window.webContents);

  const notifyFullScreenChanged = () => {
    window.webContents.send(DESKTOP_CHANNEL.fullScreenChanged, window.isFullScreen());
  };
  const notifyMaximizedChanged = () => {
    window.webContents.send(DESKTOP_CHANNEL.maximizedChanged, window.isMaximized());
  };
  window.webContents.on('did-finish-load', () => {
    notifyFullScreenChanged();
    notifyMaximizedChanged();
    sendAppNavigationState(window.webContents);
  });
  window.webContents.on('did-navigate', () => sendAppNavigationState(window.webContents));
  window.webContents.on('did-navigate-in-page', () => sendAppNavigationState(window.webContents));
  window.on('enter-full-screen', notifyFullScreenChanged);
  window.on('leave-full-screen', notifyFullScreenChanged);
  window.on('maximize', notifyMaximizedChanged);
  window.on('unmaximize', notifyMaximizedChanged);

  void window.loadURL(buildRendererEntryUrl());

  return window;
}

function registerDesktopIpcHandlers(): void {
  ipcMain.handle(DESKTOP_CHANNEL.getAppVersion, () => app.getVersion());
  ipcMain.handle(DESKTOP_CHANNEL.openExternal, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !isExternalUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });
  ipcMain.handle(DESKTOP_CHANNEL.setColorScheme, (_event, scheme: unknown) => {
    if (!isColorScheme(scheme)) return;
    applyDesktopIcon(scheme);
  });
  ipcMain.handle(DESKTOP_CHANNEL.windowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle(DESKTOP_CHANNEL.windowMaximizeToggle, (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) return;
    if (browserWindow.isMaximized()) {
      browserWindow.unmaximize();
    } else {
      browserWindow.maximize();
    }
  });
  ipcMain.handle(DESKTOP_CHANNEL.windowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle(DESKTOP_CHANNEL.navigationBack, (event) => {
    const contents = event.sender;
    if (!getAppNavigationState(contents).canGoBack) return false;
    contents.navigationHistory.goBack();
    return true;
  });
  ipcMain.handle(DESKTOP_CHANNEL.navigationForward, (event) => {
    const contents = event.sender;
    if (!getAppNavigationState(contents).canGoForward) return false;
    contents.navigationHistory.goForward();
    return true;
  });
  ipcMain.handle(DESKTOP_CHANNEL.savePdfFromHtml, async (event, options: unknown) => {
    if (
      !options ||
      typeof options !== 'object' ||
      typeof (options as { html?: unknown }).html !== 'string'
    ) {
      return null;
    }

    const parent = BrowserWindow.fromWebContents(event.sender);
    return savePdfFromHtml(
      parent,
      (options as { html: string }).html,
      normalizePdfDefaultName((options as { defaultFileName?: unknown }).defaultFileName)
    );
  });
}

app.whenReady().then(() => {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }

  protocol.handle(APP_SCHEME, (request) => {
    if (new URL(request.url).host !== APP_HOST) {
      return new Response('Not Found', { status: 404 });
    }
    return net.fetch(pathToFileURL(resolveRendererAsset(request.url)).toString());
  });
  registerDesktopIpcHandlers();
  createMainWindow();
  applyDesktopIcon(currentColorScheme);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
