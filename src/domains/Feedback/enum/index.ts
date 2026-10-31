import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

export const FEEDBACK_TYPE = defineEnum([
  'BUG_REPORT',
  'SUGGESTION',
  'CONSULTATION',
  'COMPLAINT',
  'OTHER',
] as const);

export type FeedbackType = EnumValue<typeof FEEDBACK_TYPE>;
