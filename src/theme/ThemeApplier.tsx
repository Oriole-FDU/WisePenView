import { useTheme } from '@heroui/react';
import type { ReactNode } from 'react';

import { DEFAULT_COLOR_SCHEME, DEFAULT_HEROUI_THEME } from './constants';
import { useColorScheme } from './useColorScheme';

type ThemeApplierProps = {
  children: ReactNode;
  defaultTheme?: string;
};

/** 根节点同步明暗与配色到 documentElement */
export function ThemeApplier({ children, defaultTheme = DEFAULT_HEROUI_THEME }: ThemeApplierProps) {
  useTheme(defaultTheme);
  useColorScheme(DEFAULT_COLOR_SCHEME);

  return <>{children}</>;
}
