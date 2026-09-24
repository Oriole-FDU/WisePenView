export const HEROUI_SYSTEM_THEME = 'system' as const;

export const DEFAULT_HEROUI_THEME = HEROUI_SYSTEM_THEME;

/** 明暗模式 */
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

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
