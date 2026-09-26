import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

export const SKILL_VERSION_STATUS = createEnum([
  { value: 'DRAFT', key: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', key: 'PUBLISHED', label: '已发布' },
] as const);

export type SkillVersionStatus = EnumValue<typeof SKILL_VERSION_STATUS>;
