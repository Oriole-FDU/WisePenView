function toNumber(id: string | number): number {
  return typeof id === 'string' ? parseInt(id, 10) : id;
}

/** 将 (string | number)[] 或 string | number 统一转为 number[] 或 number */
export function toNumberIds(ids: (string | number)[]): number[];
export function toNumberIds(id: string | number): number;
export function toNumberIds(
  idOrIds: (string | number)[] | (string | number)
): number[] | number {
  return Array.isArray(idOrIds) ? idOrIds.map(toNumber) : toNumber(idOrIds);
}

/** 数字千分位格式化 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
