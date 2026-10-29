export type EnumOption = {
  readonly value: string | number;
  readonly key: string;
};

export type EnumKey<T extends { options: readonly EnumOption[] }> = T['options'][number]['key'];
export type EnumValue<T extends { options: readonly EnumOption[] }> = T['options'][number]['value'];

type IdentityEnumOptions<Values extends readonly string[]> = readonly {
  readonly key: Values[number];
  readonly value: Values[number];
}[];

type MappedEnumOptions<Mapping extends Readonly<Record<string, string | number>>> = readonly {
  readonly [Key in Extract<keyof Mapping, string>]: {
    readonly key: Key;
    readonly value: Mapping[Key];
  };
}[Extract<keyof Mapping, string>][];

export type EnumDefinition<
  Options extends readonly EnumOption[],
  Values extends Readonly<Record<string, string | number>>,
> = Readonly<Values> & {
  readonly options: Options;
  getOption: (value: unknown) => Options[number] | undefined;
  isValue: (value: unknown) => value is Options[number]['value'];
};

const createEnumDefinition = <
  const Options extends readonly EnumOption[],
  Values extends Readonly<Record<string, string | number>>,
>(
  options: Options,
  values: Values
): EnumDefinition<Options, Values> => {
  const optionByValue = new Map<unknown, Options[number]>(
    options.map((item) => [item.value, item])
  );
  return {
    ...values,
    options,
    getOption: (value: unknown): Options[number] | undefined => optionByValue.get(value),
    isValue: (value: unknown): value is Options[number]['value'] => optionByValue.has(value),
  };
};

const isIdentityEnumInput = (
  input: readonly string[] | Readonly<Record<string, string | number>>
): input is readonly string[] => Array.isArray(input);

/**
 * 定义前端枚举，同时提供直接属性、有序元数据和安全查询。
 *
 * - 字符串数组表示 key 与 value 相同的普通枚举。
 * - 对象表示前端 key 到后端 wire value 的映射枚举。
 */
export function defineEnum<const Values extends readonly string[]>(
  values: Values
): EnumDefinition<IdentityEnumOptions<Values>, { readonly [Value in Values[number]]: Value }>;
export function defineEnum<const Mapping extends Readonly<Record<string, string | number>>>(
  mapping: Mapping
): EnumDefinition<MappedEnumOptions<Mapping>, Mapping>;
export function defineEnum(input: readonly string[] | Readonly<Record<string, string | number>>) {
  if (isIdentityEnumInput(input)) {
    const options = input.map((value) => ({
      key: value,
      value,
    })) as unknown as readonly EnumOption[];
    const values = Object.fromEntries(input.map((value) => [value, value]));
    return createEnumDefinition(options, values);
  }

  const entries = Object.entries(input);
  const options = entries.map(([key, value]) => ({ key, value })) as readonly EnumOption[];
  return createEnumDefinition(options, input);
}
