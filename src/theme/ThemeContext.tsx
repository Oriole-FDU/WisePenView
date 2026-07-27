import { useTheme as useHeroUITheme } from '@heroui/react';
import { useEffect, type ReactNode } from 'react';
import { ThemeContext, type ResolvedTheme, type ThemeMode } from './ThemeContextValue';

export { ThemeContext } from './ThemeContextValue';
export type { ResolvedTheme, ThemeContextValue, ThemeMode } from './ThemeContextValue';

const PREFERS_DARK_MEDIA = '(prefers-color-scheme: dark)';

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.(PREFERS_DARK_MEDIA).matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const el = document.documentElement;
  if (el.classList.contains(resolved) && el.getAttribute('data-theme') === resolved) return;
  el.classList.remove('light', 'dark');
  el.classList.add(resolved);
  el.setAttribute('data-theme', resolved);
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

export function ThemeContextProvider({
  children,
  defaultTheme = 'light',
}: {
  children: ReactNode;
  defaultTheme?: string;
}) {
  const { theme: heroTheme, setTheme: heroSetTheme } = useHeroUITheme(defaultTheme);

  const resolved = resolveTheme((heroTheme as ThemeMode) || 'light');

  /**
   * @wisepen-manual-effect
   * 执行时机：主题模式或解析后的明暗主题变化时同步页面根节点。
   * 不可替代原因：document class、data-theme 和系统媒体查询都属于 React 外部状态。
   * cleanup：移除本轮注册的系统主题媒体查询监听器；非 system 模式没有监听器。
   */
  useEffect(() => {
    applyThemeToDOM(resolved);
    if (heroTheme !== 'system') return;
    const media = window.matchMedia(PREFERS_DARK_MEDIA);
    const handler = () => applyThemeToDOM(getSystemPreference());
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [heroTheme, resolved]);

  return (
    <ThemeContext.Provider
      value={{ theme: heroTheme as ThemeMode, resolvedTheme: resolved, setTheme: heroSetTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
