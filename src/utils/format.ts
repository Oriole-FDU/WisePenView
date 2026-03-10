/** 将字节数格式化为可读字符串（B, KB, MB, GB） */
export function formatSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
