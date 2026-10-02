import { Autocomplete as HeroAutocomplete, Label } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type {
  AutocompleteClearButtonProps,
  AutocompleteFilterProps,
  AutocompleteIndicatorProps,
  AutocompletePopoverProps,
  AutocompleteProps,
  AutocompleteTriggerProps,
  AutocompleteValueProps,
} from './index.type';
import styles from './style.module.less';

function AutocompleteRoot<T extends object = object, M extends 'single' | 'multiple' = 'single'>({
  className,
  label,
  labelClassName,
  variant = 'secondary',
  isRequired,
  children,
  ...props
}: AutocompleteProps<T, M>) {
  return (
    <HeroAutocomplete
      variant={variant}
      className={clsx(styles.autocomplete, className)}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={labelClassName} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children as ReactNode}
    </HeroAutocomplete>
  );
}

function AutocompleteTrigger({ className, ...props }: AutocompleteTriggerProps) {
  return (
    <HeroAutocomplete.Trigger className={clsx(styles.autocompleteTrigger, className)} {...props} />
  );
}

function AutocompleteValue({ className, ...props }: AutocompleteValueProps) {
  return <HeroAutocomplete.Value className={className} {...props} />;
}

function AutocompleteIndicator({ className, ...props }: AutocompleteIndicatorProps) {
  return <HeroAutocomplete.Indicator className={className} {...props} />;
}

function AutocompleteClearButton({ className, ...props }: AutocompleteClearButtonProps) {
  return <HeroAutocomplete.ClearButton className={className} {...props} />;
}

function AutocompletePopover({ className, ...props }: AutocompletePopoverProps) {
  return (
    <HeroAutocomplete.Popover className={clsx(styles.autocompletePopover, className)} {...props} />
  );
}

const Autocomplete = Object.assign(AutocompleteRoot, {
  ClearButton: AutocompleteClearButton,
  Filter: HeroAutocomplete.Filter,
  Indicator: AutocompleteIndicator,
  Popover: AutocompletePopover,
  Root: AutocompleteRoot,
  Trigger: AutocompleteTrigger,
  Value: AutocompleteValue,
});

export type {
  AutocompleteClearButtonProps,
  AutocompleteFilterProps,
  AutocompleteIndicatorProps,
  AutocompletePopoverProps,
  AutocompleteProps,
  AutocompleteTriggerProps,
  AutocompleteValueProps,
};
export default Autocomplete;
