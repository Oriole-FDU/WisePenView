import { Description, ErrorMessage, Label, TextField } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { FormFieldProps } from './index.type';
import styles from './style.module.less';

function FormField({
  label,
  description,
  errorMessage,
  children,
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
  isInvalid,
  isRequired,
  ...props
}: FormFieldProps) {
  const invalid = isInvalid ?? Boolean(errorMessage);

  return (
    <TextField
      className={cn(styles.field, className)}
      isInvalid={invalid}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={cn(styles.label, labelClassName)} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children}
      {description ? (
        <Description className={cn(styles.description, descriptionClassName)}>
          {description}
        </Description>
      ) : null}
      {errorMessage ? (
        <ErrorMessage className={cn(styles.error, errorClassName)}>{errorMessage}</ErrorMessage>
      ) : null}
    </TextField>
  );
}

export type { FormFieldProps };
export default FormField;
