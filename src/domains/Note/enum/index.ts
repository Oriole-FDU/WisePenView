import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

export const AI_DIFF_DISPLAY_MODE = createEnum([
  { value: 'oldOnly', key: 'OLD_ONLY', label: '仅旧文本' },
  { value: 'newOnly', key: 'NEW_ONLY', label: '仅新文本' },
  { value: 'compare', key: 'COMPARE', label: '新旧对比' },
] as const);

export type AiDiffDisplayMode = EnumValue<typeof AI_DIFF_DISPLAY_MODE>;

export const AI_DIFF_DISPLAY_MODE_LABELS = AI_DIFF_DISPLAY_MODE.labels;
