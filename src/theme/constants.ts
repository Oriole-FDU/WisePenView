import { createContext } from 'react';

export const HEROUI_SYSTEM_THEME = 'system' as const;

export const DEFAULT_HEROUI_THEME = HEROUI_SYSTEM_THEME;

/** 明暗模式 */
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];
export type ResolvedTheme = Exclude<ThemeMode, typeof THEME_MODE.SYSTEM>;

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** 主题配色 */
export const COLOR_SCHEME = {
  DEFAULT: 'default',
  FLORAL: 'floral',
  AQUA: 'aqua',
  SUNSET: 'sunset',
  EMERALD: 'emerald',
  LAVENDER: 'lavender',
} as const;

export type ColorScheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];

export const DEFAULT_COLOR_SCHEME = COLOR_SCHEME.AQUA;

export interface ColorSchemeOption {
  id: ColorScheme;
  labelKey: string;
  descriptionKey: string;
}

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
  {
    id: COLOR_SCHEME.AQUA,
    labelKey: 'appearance.scheme.aqua.label',
    descriptionKey: 'appearance.scheme.aqua.description',
  },
  {
    id: COLOR_SCHEME.DEFAULT,
    labelKey: 'appearance.scheme.default.label',
    descriptionKey: 'appearance.scheme.default.description',
  },
  {
    id: COLOR_SCHEME.FLORAL,
    labelKey: 'appearance.scheme.floral.label',
    descriptionKey: 'appearance.scheme.floral.description',
  },
  {
    id: COLOR_SCHEME.SUNSET,
    labelKey: 'appearance.scheme.sunset.label',
    descriptionKey: 'appearance.scheme.sunset.description',
  },
  {
    id: COLOR_SCHEME.EMERALD,
    labelKey: 'appearance.scheme.emerald.label',
    descriptionKey: 'appearance.scheme.emerald.description',
  },
  {
    id: COLOR_SCHEME.LAVENDER,
    labelKey: 'appearance.scheme.lavender.label',
    descriptionKey: 'appearance.scheme.lavender.description',
  },
];

export const THEME_MODE_OPTIONS: Array<{
  id: ThemeMode;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    id: THEME_MODE.SYSTEM,
    labelKey: 'appearance.modeOption.system.label',
    descriptionKey: 'appearance.modeOption.system.description',
  },
  {
    id: THEME_MODE.LIGHT,
    labelKey: 'appearance.modeOption.light.label',
    descriptionKey: 'appearance.modeOption.light.description',
  },
  {
    id: THEME_MODE.DARK,
    labelKey: 'appearance.modeOption.dark.label',
    descriptionKey: 'appearance.modeOption.dark.description',
  },
];
