import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

export const AI_DIFF_DISPLAY_MODE = defineEnum({
  OLD_ONLY: 'oldOnly',
  NEW_ONLY: 'newOnly',
  COMPARE: 'compare',
} as const);

export type AiDiffDisplayMode = EnumValue<typeof AI_DIFF_DISPLAY_MODE>;
