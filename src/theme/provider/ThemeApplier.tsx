import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { ThemeProvider } from '../_context';
import { DEFAULT_COLOR_SCHEME } from '../colorScheme/constants';
import { applyColorSchemeFavicon, applyColorSchemeToDOM } from '../colorScheme/dom';
import { useColorScheme } from '../colorScheme/useColorScheme';
import { DEFAULT_HEROUI_THEME } from '../mode/constants';
import { applyReadingModeToDOM } from '../readingMode/dom';
import { useReadingMode } from '../readingMode/useReadingMode';

type ThemeApplierProps = {
  children: ReactNode;
  defaultTheme?: string;
};

/** 根节点同步明暗与配色到 documentElement */
export function ThemeApplier({ children, defaultTheme = DEFAULT_HEROUI_THEME }: ThemeApplierProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <ThemeGlobalApplier>{children}</ThemeGlobalApplier>
    </ThemeProvider>
  );
}

function ThemeGlobalApplier({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme(DEFAULT_COLOR_SCHEME);
  const { isReadingMode } = useReadingMode();

  /**
   * @wisepen-manual-effect
   * 执行时机：主题色变化后，同步 document、favicon 和 Electron 外壳图标。
   * 不可替代原因：这些都属于 React 外部状态，且只应由根节点统一驱动一次。
   * cleanup：无；这里只做同步写入，不注册监听器。
   */
  useEffect(() => {
    applyColorSchemeToDOM(colorScheme);
    applyColorSchemeFavicon(colorScheme);
    void window.desktop?.setColorScheme?.(colorScheme);
  }, [colorScheme]);

  /**
   * @wisepen-manual-effect
   * 执行时机：阅读模式变化后，同步 data attribute 到 documentElement。
   * 不可替代原因：这是跨组件的全局主题态，必须由根节点统一下发到 CSS。
   * cleanup：无；这里只做同步写入，不注册监听器。
   */
  useEffect(() => {
    applyReadingModeToDOM(isReadingMode);
  }, [isReadingMode]);

  return <>{children}</>;
}
