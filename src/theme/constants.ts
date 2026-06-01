export const DEFAULT_HEROUI_THEME = 'light' as const;

export const HEROUI_SYSTEM_THEME = 'system' as const;

/** 明暗模式 */
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

/** 主题配色 */
export const COLOR_SCHEME = {
  DEFAULT: 'default',
  WARM: 'warm',
  ACADEMIC: 'academic',
  VIOLET: 'violet',
  FOREST: 'forest',
  MINIMAL: 'minimal',
} as const;

export type ColorScheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];

export const DEFAULT_COLOR_SCHEME = COLOR_SCHEME.DEFAULT;

export interface ColorSchemeOption {
  id: ColorScheme;
  label: string;
  description: string;
}

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
  {
    id: COLOR_SCHEME.DEFAULT,
    label: '默认',
    description: '蓝灰主题',
  },
  {
    id: COLOR_SCHEME.WARM,
    label: '温暖',
    description: '柔和主题',
  },
  {
    id: COLOR_SCHEME.ACADEMIC,
    label: '学术',
    description: '严谨主题',
  },
  {
    id: COLOR_SCHEME.VIOLET,
    label: '紫色',
    description: '紫色主题',
  },
  {
    id: COLOR_SCHEME.FOREST,
    label: '森绿',
    description: '沉静主题',
  },
  {
    id: COLOR_SCHEME.MINIMAL,
    label: '极简',
    description: '经典蓝紫',
  },
];

export const THEME_MODE_OPTIONS: Array<{ id: ThemeMode; label: string; description: string }> = [
  { id: THEME_MODE.LIGHT, label: '浅色', description: '始终使用浅色界面' },
  { id: THEME_MODE.DARK, label: '深色', description: '始终使用深色界面' },
  { id: THEME_MODE.SYSTEM, label: '跟随系统', description: '随操作系统明暗设置切换' },
];
