import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** Skill 与 Agent 共用的后端资产类型。 */
export const ASSET_RESOURCE_TYPE = defineEnum([
  'MD',
  'PYTHON_SCRIPT',
  'TEXT',
  'JSON',
  'YAML',
  'TOML',
] as const);

export type AssetResourceType = EnumValue<typeof ASSET_RESOURCE_TYPE>;
