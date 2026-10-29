import { z } from 'zod';

/** JSON 中必须存在的非空字符串；不 trim，密码等值可以包含空白字符。 */
export const NonEmptyStringSchema = z.string().min(1);
