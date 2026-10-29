import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 访问控制范围；领域值与后端 wire 值一致。 */
export const ACCESS_CONTROL_SCOPE = defineEnum([
  'ALL',
  'ONLY_ADMIN',
  'WHITELIST',
  'BLACKLIST',
] as const);

export type AccessControlScope = EnumValue<typeof ACCESS_CONTROL_SCOPE>;

export const isAccessControlScope = (value: unknown): value is AccessControlScope =>
  ACCESS_CONTROL_SCOPE.isValue(value);
