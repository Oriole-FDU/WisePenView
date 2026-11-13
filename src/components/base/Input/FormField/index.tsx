import { ErrorMessage, Label, TextField } from '@heroui/react';
import { clsx } from 'clsx';

import FieldHelp from '@/components/base/FieldHelp';

import type { FormFieldProps } from './index.type';
import styles from './style.module.scss';

function FormField({
  label,
  help,
  errorMessage,
  children,
  className,
  labelClassName,
  errorClassName,
  isInvalid,
  isRequired,
  ...props
}: FormFieldProps) {
  const invalid = isInvalid ?? Boolean(errorMessage);

  return (
    <TextField
      className={clsx(styles.field, className)}
      isInvalid={invalid}
      isRequired={isRequired}
      {...props}
    >
      {label || help ? (
        <div className={styles.labelRow}>
          {label ? (
            <Label className={clsx(styles.label, labelClassName)} isRequired={isRequired}>
              {label}
            </Label>
          ) : null}
          {help ? <FieldHelp {...help} /> : null}
        </div>
      ) : null}
      {children}
      {errorMessage ? (
        <ErrorMessage className={clsx(styles.error, errorClassName)}>{errorMessage}</ErrorMessage>
      ) : null}
    </TextField>
  );
}

export type { FormFieldProps };
export default FormField;
