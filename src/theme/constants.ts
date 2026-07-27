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
  FLORAL: 'floral',
  AQUA: 'aqua',
  SUNSET: 'sunset',
  EMERALD: 'emerald',
  LAVENDER: 'lavender',
  SPROUT: 'vanilla',
} as const;

export type ColorScheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];

export const DEFAULT_COLOR_SCHEME = COLOR_SCHEME.DEFAULT;

/** HeroUI 主题页 Radius 配置 */
export const THEME_RADIUS = {
  NONE: 'none',
  EXTRA_SMALL: 'extra-small',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type ThemeRadius = (typeof THEME_RADIUS)[keyof typeof THEME_RADIUS];

/** HeroUI 主题页 Radius Form 配置 */
export const THEME_FORM_RADIUS = {
  ...THEME_RADIUS,
  EXTRA_LARGE: 'extra-large',
} as const;

export type ThemeFormRadius = (typeof THEME_FORM_RADIUS)[keyof typeof THEME_FORM_RADIUS];

export const DEFAULT_THEME_RADIUS = THEME_RADIUS.MEDIUM;
export const DEFAULT_THEME_FORM_RADIUS = THEME_FORM_RADIUS.LARGE;

export interface ColorSchemeOption {
  id: ColorScheme;
  labelKey: string;
  descriptionKey: string;
}

export interface ThemeRadiusOption {
  id: ThemeRadius;
  label: string;
  description: string;
  cssValue: string;
}

export interface ThemeFormRadiusOption {
  id: ThemeFormRadius;
  label: string;
  description: string;
  cssValue: string;
}

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
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
    id: COLOR_SCHEME.AQUA,
    labelKey: 'appearance.scheme.aqua.label',
    descriptionKey: 'appearance.scheme.aqua.description',
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
  {
    id: COLOR_SCHEME.SPROUT,
    labelKey: 'appearance.scheme.sprout.label',
    descriptionKey: 'appearance.scheme.sprout.description',
  },
];

export const THEME_MODE_OPTIONS: Array<{
  id: ThemeMode;
  labelKey: string;
  descriptionKey: string;
}> = [
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
  {
    id: THEME_MODE.SYSTEM,
    labelKey: 'appearance.modeOption.system.label',
    descriptionKey: 'appearance.modeOption.system.description',
  },
];

export const THEME_RADIUS_OPTIONS: ThemeRadiusOption[] = [
  { id: THEME_RADIUS.NONE, label: '-', description: '0', cssValue: '0' },
  { id: THEME_RADIUS.EXTRA_SMALL, label: 'XS', description: '2px', cssValue: '0.125rem' },
  { id: THEME_RADIUS.SMALL, label: 'S', description: '4px', cssValue: '0.25rem' },
  { id: THEME_RADIUS.MEDIUM, label: 'M', description: '8px', cssValue: '0.5rem' },
  { id: THEME_RADIUS.LARGE, label: 'L', description: '12px', cssValue: '0.75rem' },
];

export const THEME_FORM_RADIUS_OPTIONS: ThemeFormRadiusOption[] = [
  ...THEME_RADIUS_OPTIONS,
  { id: THEME_FORM_RADIUS.EXTRA_LARGE, label: 'XL', description: '16px', cssValue: '1rem' },
];
