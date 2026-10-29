import { z } from 'zod';

type RecursiveTreeNode<Shape extends z.ZodRawShape> = z.infer<z.ZodObject<Shape>> & {
  children: RecursiveTreeNode<Shape>[];
};

/** 从节点字段 Schema 建立 children 自引用的树形响应 Schema。 */
export const createTreeSchema = <Shape extends z.ZodRawShape>(
  shape: Shape
): z.ZodType<RecursiveTreeNode<Shape>> => {
  // Zod 的泛型推导无法直接表达递归输出，递归类型由同一字段 Schema 构造。
  const schema = z.lazy(() =>
    z.object({
      ...shape,
      children: z.array(schema),
    })
  ) as unknown as z.ZodType<RecursiveTreeNode<Shape>>;
  return schema;
};
