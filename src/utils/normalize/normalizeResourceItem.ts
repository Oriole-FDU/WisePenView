import type { ResourceItem } from '@/domains/Resource';

/**
 * 归一化后端返回的 ResourceItem：将 Java `Long` 在 JSON 中以字符串形式返回的字段
 * （`readCount`、`likeCount`）转换为真正的 `number`，确保前端可以安全地参与算术运算。
 */
export function normalizeResourceItem<T extends Partial<ResourceItem> | null | undefined>(
  raw: T
): T {
  if (raw == null) return raw;
  const next: Partial<ResourceItem> = { ...raw };
  if (raw.readCount != null) next.readCount = Number(raw.readCount);
  if (raw.likeCount != null) next.likeCount = Number(raw.likeCount);
  return next as T;
}
