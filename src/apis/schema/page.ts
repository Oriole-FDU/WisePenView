import { z } from 'zod';

import { JavaLongStringSchema } from './ids';

/** Java PageR 分页请求的公共 query。 */
export const PageApiRequestSchema = z.strictObject({
  page: z.number().int().min(1),
  size: z.number().int().min(1),
});

/** Java PageR 分页响应的公共字段。 */
export const createPageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  z.object({
    list: z.array(itemSchema),
    // PageR.total 是 Java primitive long，统一 Jackson 配置会输出字符串；
    // 契约在边界转回安全整数，避免分页累计值以 bigint 字符串泄漏到 UI。
    total: JavaLongStringSchema.transform(Number).pipe(
      z.number().int().nonnegative().refine(Number.isSafeInteger)
    ),
    page: z.number().int().min(1),
    size: z.number().int().min(1),
    totalPage: z.number().int().nonnegative(),
  });
