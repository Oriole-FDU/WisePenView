import { z } from 'zod';

/** Java PageR 分页请求的公共 query。 */
export const PageApiRequestSchema = z.strictObject({
  page: z.number().int().min(1),
  size: z.number().int().min(1),
});

/** Java PageR 分页响应的公共字段。 */
export const createPageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  z.object({
    list: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    size: z.number().int().min(1),
    totalPage: z.number().int().nonnegative(),
  });
