import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

export const SKILL_VERSION_STATUS = createEnum([
  { value: 'DRAFT', key: 'DRAFT' },
  { value: 'PUBLISHED', key: 'PUBLISHED' },
] as const);

export type SkillVersionStatus = EnumValue<typeof SKILL_VERSION_STATUS>;
