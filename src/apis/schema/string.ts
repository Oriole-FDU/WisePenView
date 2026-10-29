import { z } from 'zod';

/** JSON 中必须存在的非空字符串；不 trim，密码等值可以包含空白字符。 */
export const NonEmptyStringSchema = z.string().min(1);

/** 必须存在但允许 null 的字符串。 */
export const NullableStringSchema = z.string().nullable();

/** JSON 中允许省略的普通字符串；不使用 null 表示省略。 */
export const OptionalStringSchema = z.string().optional();

/** 必须包含非空白内容；统一去掉首尾空白，适用于名称等用户输入。 */
export const NonBlankStringSchema = z.string().trim().min(1);
