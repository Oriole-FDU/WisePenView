export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export type ValidationRule = {
  test: () => boolean;
  message: string;
};

export function runFieldValidation(rules: ValidationRule[]): string | undefined {
  return rules.find((rule) => !rule.test())?.message;
}

export function hasFieldErrors<T extends string>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
