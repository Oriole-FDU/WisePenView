import { z } from 'zod';

import { NonEmptyStringSchema } from './string';

/** 后端以 String 序列化的 Java Long，可能是负数，但不接受 JavaScript number。 */
export const JavaLongStringSchema = z.string().regex(/^-?\d+$/, '必须是 Java Long 字符串');

/** 平台实体 ID 的 Java Long 形式，不允许前导负号或 0。 */
export const JavaLongIdSchema = z.string().regex(/^[1-9]\d*$/, '必须是 Java Long 实体 ID 字符串');

/** Java Long 实体 ID 列表，不接受 JavaScript number。 */
export const JavaLongIdListSchema = z.array(JavaLongIdSchema);

/** MongoDB ObjectId 的十六进制字符串形式。 */
export const ObjectIdStringSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, '必须是 24 位十六进制 ObjectId');

/** 跨服务不必由前端解释的不透明 ID。 */
export const OpaqueIdSchema = NonEmptyStringSchema;
