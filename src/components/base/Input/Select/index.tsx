import { Label, Select as HeroSelect } from '@heroui/react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import type {
  SelectIndicatorProps,
  SelectPopoverProps,
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
} from './index.type';
import styles from './style.module.less';

function SelectRoot<T extends object = object, M extends 'single' | 'multiple' = 'single'>({
  className,
  label,
  labelClassName,
  variant = 'secondary',
  isRequired,
  children,
  ...props
}: SelectProps<T, M>) {
  return (
    <HeroSelect
      variant={variant}
      className={cn(styles.select, className)}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={labelClassName} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children as ReactNode}
    </HeroSelect>
  );
}

function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  return (
    <HeroSelect.Trigger className={cn(styles.selectTrigger, className)} {...props}>
      {children === undefined ? (
        <>
          <SelectValue />
          <SelectIndicator />
        </>
      ) : (
        children
      )}
    </HeroSelect.Trigger>
  );
}

function SelectValue({ className, ...props }: SelectValueProps) {
  return <HeroSelect.Value className={className} {...props} />;
}

function SelectIndicator({ className, ...props }: SelectIndicatorProps) {
  return <HeroSelect.Indicator className={className} {...props} />;
}

function SelectPopover({ className, ...props }: SelectPopoverProps) {
  return <HeroSelect.Popover className={cn(styles.selectPopover, className)} {...props} />;
}

const Select = Object.assign(SelectRoot, {
  Indicator: SelectIndicator,
  Popover: SelectPopover,
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
});

export type {
  SelectIndicatorProps,
  SelectPopoverProps,
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
} from './index.type';
export default Select;
