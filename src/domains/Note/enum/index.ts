import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

export const AI_DIFF_DISPLAY_MODE = createEnum([
  { value: 'oldOnly', key: 'OLD_ONLY' },
  { value: 'newOnly', key: 'NEW_ONLY' },
  { value: 'compare', key: 'COMPARE' },
] as const);

export type AiDiffDisplayMode = EnumValue<typeof AI_DIFF_DISPLAY_MODE>;
