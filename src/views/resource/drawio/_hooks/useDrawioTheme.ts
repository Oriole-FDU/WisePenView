import { type RefObject, useEffect, useState } from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { COLOR_SCHEME, DEFAULT_COLOR_SCHEME } from '@/theme';

import { type DrawioThemeCommand, readDrawioMessage, type WisePenTheme } from '../drawioProtocol';

const COLOR_SCHEMES = new Set<string>(Object.values(COLOR_SCHEME));

// 只传递编辑器外壳使用的语义变量，图形内容的颜色仍由文档决定。
const THEME_TOKENS = [
  '--accent',
  '--accent-foreground',
  '--accent-text',
  '--accent-text-strong',
  '--accent-soft',
  '--accent-soft-foreground',
  '--accent-soft-hover',
  '--accent-selected',
  '--accent-border',
  '--accent-hover',
  '--background',
  '--foreground',
  '--muted',
  '--surface',
  '--surface-foreground',
  '--surface-secondary',
  '--surface-tertiary',
  '--surface-hover',
  '--overlay',
  '--overlay-foreground',
  '--border',
  '--separator',
  '--field-background',
  '--field-foreground',
  '--focus',
  '--selection',
  '--text-tertiary',
  '--scrollbar',
  '--scrollbar-thumb-hover',
  '--card-shadow',
  '--overlay-shadow',
  '--app-font-family',
  '--font-size-base',
  '--font-size-xs',
  '--radius',
  '--radius-sm',
  '--radius-lg',
  '--radius-xl',
  '--app-radius-popover',
] as const;

function readTheme() {
  const root = document.documentElement;
  const theme: WisePenTheme =
    root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark')
      ? 'dark'
      : 'light';
  let colorScheme = root.getAttribute('data-color-scheme');
  if (!colorScheme) {
    try {
      colorScheme = window.localStorage.getItem(STORAGE_KEYS.colorScheme);
    } catch {
      // 存储不可用时沿用应用默认配色。
    }
  }
  if (colorScheme === 'default') colorScheme = COLOR_SCHEME.MIST;
  return {
    theme,
    colorScheme: colorScheme && COLOR_SCHEMES.has(colorScheme) ? colorScheme : DEFAULT_COLOR_SCHEME,
  };
}

export function useDrawioTheme(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  drawioOrigin: string
) {
  // URL 只使用会话开始时的主题，后续切换通过消息更新，避免重载丢失未保存的画板。
  const [initialTheme] = useState(readTheme);

  /**
   * @wisepen-manual-effect
   * 执行时机：挂载、宿主主题属性变化，以及编辑器初始化或文档加载完成后。
   * 不可替代原因：系统主题会直接更新 DOM，跨域 iframe 只能通过消息接收实际 CSS 变量。
   * cleanup：断开根节点观察器并移除消息监听，避免关闭画板后继续同步。
   */
  useEffect(() => {
    const syncTheme = () => {
      const computed = window.getComputedStyle(document.documentElement);
      const tokens: Record<string, string> = {};
      for (const token of THEME_TOKENS) {
        tokens[token] = computed.getPropertyValue(token).trim();
      }
      const message: DrawioThemeCommand = { action: 'wisepenTheme', ...readTheme(), tokens };
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), drawioOrigin);
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== drawioOrigin || event.source !== iframeRef.current?.contentWindow)
        return;
      const message = readDrawioMessage(event.data);
      if (message?.event === 'init' || message?.event === 'load') syncTheme();
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-reading-mode', 'style'],
    });
    window.addEventListener('message', handleMessage);
    syncTheme();
    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, [iframeRef, drawioOrigin]);

  return initialTheme;
}
