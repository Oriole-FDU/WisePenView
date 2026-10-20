/** null/undefined 保持为 null；非空值交给 mapper 转换。 */
export const mapNullable = <T, R>(
  value: T | null | undefined,
  mapper: (value: T) => R
): R | null => (value == null ? null : mapper(value));

/** null/undefined 保持为 undefined；非空值交给 mapper 转换。 */
export const mapOptional = <T, R>(
  value: T | null | undefined,
  mapper: (value: T) => R
): R | undefined => (value == null ? undefined : mapper(value));
