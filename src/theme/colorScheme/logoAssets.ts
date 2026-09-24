import logoFullAquaDark from '@/assets/logos/logo-full-aqua-dark.svg';
import logoFullAquaLight from '@/assets/logos/logo-full-aqua-light.svg';
import logoFullEmeraldDark from '@/assets/logos/logo-full-emerald-dark.svg';
import logoFullEmeraldLight from '@/assets/logos/logo-full-emerald-light.svg';
import logoFullFloralDark from '@/assets/logos/logo-full-floral-dark.svg';
import logoFullFloralLight from '@/assets/logos/logo-full-floral-light.svg';
import logoFullLavenderDark from '@/assets/logos/logo-full-lavender-dark.svg';
import logoFullLavenderLight from '@/assets/logos/logo-full-lavender-light.svg';
import logoFullMistDark from '@/assets/logos/logo-full-mist-dark.svg';
import logoFullMistLight from '@/assets/logos/logo-full-mist-light.svg';
import logoFullSunsetDark from '@/assets/logos/logo-full-sunset-dark.svg';
import logoFullSunsetLight from '@/assets/logos/logo-full-sunset-light.svg';

import type { ResolvedTheme } from '../mode/constants';
import { COLOR_SCHEME, type ColorScheme } from './constants';

export const COLOR_SCHEME_LOGO_SRC: Record<ColorScheme, Record<ResolvedTheme, string>> = {
  [COLOR_SCHEME.AQUA]: {
    light: logoFullAquaLight,
    dark: logoFullAquaDark,
  },
  [COLOR_SCHEME.MIST]: {
    light: logoFullMistLight,
    dark: logoFullMistDark,
  },
  [COLOR_SCHEME.FLORAL]: {
    light: logoFullFloralLight,
    dark: logoFullFloralDark,
  },
  [COLOR_SCHEME.SUNSET]: {
    light: logoFullSunsetLight,
    dark: logoFullSunsetDark,
  },
  [COLOR_SCHEME.EMERALD]: {
    light: logoFullEmeraldLight,
    dark: logoFullEmeraldDark,
  },
  [COLOR_SCHEME.LAVENDER]: {
    light: logoFullLavenderLight,
    dark: logoFullLavenderDark,
  },
};
