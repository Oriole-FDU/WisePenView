/** 主题配色 */
export const COLOR_SCHEME = {
  AQUA: 'aqua',
  MIST: 'mist',
  FLORAL: 'floral',
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
    id: COLOR_SCHEME.MIST,
    labelKey: 'appearance.scheme.mist.label',
    descriptionKey: 'appearance.scheme.mist.description',
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
