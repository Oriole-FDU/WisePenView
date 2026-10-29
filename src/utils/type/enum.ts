type EnumConfigItem = {
  value: string | number;
  key: string;
  [key: string]: unknown;
};

export type EnumKey<T extends { options: readonly { key: string }[] }> =
  T['options'][number]['key'];
export type EnumValue<T extends { options: readonly { value: string | number }[] }> =
  T['options'][number]['value'];

/**
 * 高级枚举创建工具
 * 将配置、数值和类型聚合在一起，解决原生 Enum 信息碎片化的问题。
 */
export function createEnum<const T extends readonly EnumConfigItem[]>(cfg: T) {
  const values = Object.fromEntries(cfg.map((item) => [item.key, item.value])) as {
    [K in T[number]['key']]: Extract<T[number], { key: K }>['value'];
  };
  const optionByValue = new Map<unknown, T[number]>(cfg.map((item) => [item.value, item]));

  return {
    ...values,

    /** 原始数组：用于 Select/Radio 的 options */
    options: cfg,

    /** 通过 Value 获取 Key，找不到时返回 undefined */
    getKey: (value: string | number): T[number]['key'] | undefined => optionByValue.get(value)?.key,

    /** 判断值是否为合法枚举值 */
    isValue: (value: unknown): value is T[number]['value'] => optionByValue.has(value),
  };
}
