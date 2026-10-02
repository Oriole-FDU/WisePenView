import { Label, NumberField as HeroNumberField } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { NumberFieldProps } from './index.type';
import styles from './style.module.less';

function NumberFieldRoot({
  className,
  label,
  labelClassName,
  variant = 'secondary',
  isRequired,
  children,
  ...props
}: NumberFieldProps) {
  return (
    <HeroNumberField
      variant={variant}
      className={clsx(styles.numberField, className)}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={labelClassName} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children as ReactNode}
    </HeroNumberField>
  );
}

const NumberField = Object.assign(NumberFieldRoot, {
  DecrementButton: HeroNumberField.DecrementButton,
  Group: HeroNumberField.Group,
  IncrementButton: HeroNumberField.IncrementButton,
  Input: HeroNumberField.Input,
  Root: NumberFieldRoot,
});

export type {
  NumberFieldDecrementButtonProps,
  NumberFieldGroupProps,
  NumberFieldIncrementButtonProps,
  NumberFieldInputProps,
  NumberFieldProps,
} from './index.type';
export default NumberField;
