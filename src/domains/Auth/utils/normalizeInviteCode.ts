/** 邀请码归一化：去除首尾空白并统一为大写，保证链接参数、输入框与请求体一致 */
export function normalizeInviteCode(value: string | null | undefined): string {
  return value ? value.trim().toUpperCase() : '';
}
