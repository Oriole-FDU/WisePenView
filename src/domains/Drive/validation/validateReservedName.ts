/**
 * tag / folder 等命名场景的通用前缀保留校验。
 *
 * 背景：
 * - `/` 前缀代表路径型（folder）节点，由 Folder 域统一托管；
 * - `.` 前缀为系统保留命名空间（如 `.Trash`），对业务视图不可见。
 *
 * Service 读取侧会按上述前缀过滤结果；写入侧若不拦截，会产生"创建成功但立刻消失"的脏数据，
 * 因此在 UI 输入层统一拦截。
 */

const RESERVED_PREFIXES = ['.', '/'] as const;

/** 统一提示文案（系统保留字符） */
export const RESERVED_NAME_HINT = '`.` 和 `/` 为系统保留字符，名称不能以此开头';

export interface ReservedNameValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * 校验名称是否触达系统保留前缀。
 * @param trimmed 已 trim 过的候选名称；调用方须先保证非空。
 */
export const validateReservedName = (trimmed: string): ReservedNameValidationResult => {
  for (const prefix of RESERVED_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return { valid: false, reason: RESERVED_NAME_HINT };
    }
  }
  return { valid: true };
};
