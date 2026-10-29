export type EnumOption = {
  readonly value: string | number;
  readonly key: string;
};

export type EnumKey<T extends { options: readonly EnumOption[] }> = T['options'][number]['key'];
export type EnumValue<T extends { options: readonly EnumOption[] }> = T['options'][number]['value'];

/**
 * 定义前端枚举，同时提供直接属性、有序元数据和安全查询。
 */
export function defineEnum<const Options extends readonly EnumOption[]>(options: Options) {
  const values = Object.fromEntries(options.map((item) => [item.key, item.value])) as {
    [K in Options[number]['key']]: Extract<Options[number], { key: K }>['value'];
  };
  const optionByValue = new Map<unknown, Options[number]>(
    options.map((item) => [item.value, item])
  );

  return {
    ...values,

    /** 原始数组：用于 Select/Radio 的 options */
    options,

    /** 通过 Value 获取完整配置 */
    getOption: (value: unknown): Options[number] | undefined => optionByValue.get(value),

    /** 判断值是否为合法枚举值 */
    isValue: (value: unknown): value is Options[number]['value'] => optionByValue.has(value),
  };
}
