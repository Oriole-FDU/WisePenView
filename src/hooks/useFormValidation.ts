import { useRef, useState } from 'react';

import type { FieldErrors } from '@/utils/validation/formValidation';

interface UseFormValidationOptions<TValues extends object, TField extends keyof TValues & string> {
  initialValues: TValues | (() => TValues);
  fields: readonly TField[];
  validateField: (field: TField, values: TValues) => string | undefined;
  isFieldEmpty?: (field: TField, values: TValues) => boolean;
}

interface UseFormValidationResult<TValues extends object, TField extends keyof TValues & string> {
  values: TValues;
  errors: FieldErrors<TField>;
  changeField: <K extends TField>(
    field: K,
    value: TValues[K],
    dependentFields?: readonly TField[]
  ) => void;
  changeValues: (patch: Partial<TValues>, revalidateFields?: readonly TField[]) => void;
  blurField: (field: TField) => void;
  validateForm: () => boolean;
  reset: () => void;
}

/**
 * 统一受控表单的校验时机：首次输入保持中性，失焦后显示错误；
 * 提交尝试后，相关字段随输入实时更新错误。
 */
export function useFormValidation<TValues extends object, TField extends keyof TValues & string>({
  initialValues,
  fields,
  validateField,
  isFieldEmpty,
}: UseFormValidationOptions<TValues, TField>): UseFormValidationResult<TValues, TField> {
  const resolveInitialValues = () =>
    typeof initialValues === 'function' ? initialValues() : initialValues;
  const [values, setValuesState] = useState<TValues>(resolveInitialValues);
  const valuesRef = useRef(values);
  const [errors, setErrors] = useState<FieldErrors<TField>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<TField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const revalidateVisibleFields = (
    nextValues: TValues,
    targetFields: readonly TField[],
    nextTouchedFields: Partial<Record<TField, boolean>>,
    nextSubmitAttempted: boolean
  ) => {
    setErrors((current) => {
      const next = { ...current };
      targetFields.forEach((field) => {
        if (nextTouchedFields[field] || nextSubmitAttempted) {
          next[field] =
            !nextSubmitAttempted && isFieldEmpty?.(field, nextValues)
              ? undefined
              : validateField(field, nextValues);
        }
      });
      return next;
    });
  };

  const changeValues = (patch: Partial<TValues>, revalidateFields: readonly TField[] = []) => {
    const nextValues = Object.assign({}, valuesRef.current, patch) as TValues;
    valuesRef.current = nextValues;
    setValuesState(nextValues);
    revalidateVisibleFields(nextValues, revalidateFields, touchedFields, submitAttempted);
  };

  const changeField = <K extends TField>(
    field: K,
    value: TValues[K],
    dependentFields: readonly TField[] = []
  ) => {
    changeValues({ [field]: value } as unknown as Partial<TValues>, [field, ...dependentFields]);
  };

  const blurField = (field: TField) => {
    const nextTouchedFields = { ...touchedFields, [field]: true };
    setTouchedFields(nextTouchedFields);
    setErrors((current) => ({
      ...current,
      [field]:
        !submitAttempted && isFieldEmpty?.(field, valuesRef.current)
          ? undefined
          : validateField(field, valuesRef.current),
    }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<TField> = {};
    fields.forEach((field) => {
      nextErrors[field] = validateField(field, valuesRef.current);
    });
    setSubmitAttempted(true);
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const reset = () => {
    const nextValues = resolveInitialValues();
    valuesRef.current = nextValues;
    setValuesState(nextValues);
    setErrors({});
    setTouchedFields({});
    setSubmitAttempted(false);
  };

  return {
    values,
    errors,
    changeField,
    changeValues,
    blurField,
    validateForm,
    reset,
  };
}
