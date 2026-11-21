export const TABLE_LOAD_MORE_THRESHOLD_PX = 48;
export const TABLE_VIRTUAL_ROW_ESTIMATE_SIZE = 60;
export const TABLE_VIRTUAL_ROW_OVERSCAN = 8;

export function resolveTableMaxBodyHeight(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value}px` : value;
}
