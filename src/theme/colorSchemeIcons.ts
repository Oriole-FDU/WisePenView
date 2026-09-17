import logoIconAqua from '@/assets/logos/logo-icon-aqua.svg';
import logoIconEmerald from '@/assets/logos/logo-icon-emerald.svg';
import logoIconFloral from '@/assets/logos/logo-icon-floral.svg';
import logoIconLavender from '@/assets/logos/logo-icon-lavender.svg';
import logoIconMist from '@/assets/logos/logo-icon-mist.svg';
import logoIconSunset from '@/assets/logos/logo-icon-sunset.svg';

import { COLOR_SCHEME, type ColorScheme } from './constants';

export const COLOR_SCHEME_ICON_SRC: Record<ColorScheme, string> = {
  [COLOR_SCHEME.MIST]: logoIconMist,
  [COLOR_SCHEME.FLORAL]: logoIconFloral,
  [COLOR_SCHEME.AQUA]: logoIconAqua,
  [COLOR_SCHEME.SUNSET]: logoIconSunset,
  [COLOR_SCHEME.EMERALD]: logoIconEmerald,
  [COLOR_SCHEME.LAVENDER]: logoIconLavender,
};
