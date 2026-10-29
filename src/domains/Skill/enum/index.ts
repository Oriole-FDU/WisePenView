import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

export const SKILL_VERSION_STATUS = defineEnum(['DRAFT', 'PUBLISHED'] as const);

export type SkillVersionStatus = EnumValue<typeof SKILL_VERSION_STATUS>;
