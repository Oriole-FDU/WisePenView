import { ComboBox as HeroComboBox, Label } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import Input from '../Input';
import type {
  ComboBoxInputGroupProps,
  ComboBoxPopoverProps,
  ComboBoxProps,
  ComboBoxTriggerProps,
} from './index.type';
import styles from './style.module.less';

function ComboBoxRoot<T extends object = object>({
  className,
  label,
  labelClassName,
  variant = 'secondary',
  isRequired,
  children,
  ...props
}: ComboBoxProps<T>) {
  return (
    <HeroComboBox
      variant={variant}
      className={clsx(styles.comboBox, className)}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={labelClassName} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children as ReactNode}
    </HeroComboBox>
  );
}

function ComboBoxInputGroup({ className, ...props }: ComboBoxInputGroupProps) {
  return (
    <HeroComboBox.InputGroup className={clsx(styles.comboBoxInputGroup, className)} {...props} />
  );
}

function ComboBoxTrigger({ className, ...props }: ComboBoxTriggerProps) {
  return <HeroComboBox.Trigger className={clsx(styles.comboBoxTrigger, className)} {...props} />;
}

function ComboBoxPopover({ className, ...props }: ComboBoxPopoverProps) {
  return <HeroComboBox.Popover className={clsx(styles.comboBoxPopover, className)} {...props} />;
}

const ComboBox = Object.assign(ComboBoxRoot, {
  /* 组合框的输入框就是项目 Input，保证与其它表单控件同一套表面与焦点样式 */
  Input,
  InputGroup: ComboBoxInputGroup,
  Popover: ComboBoxPopover,
  Root: ComboBoxRoot,
  Trigger: ComboBoxTrigger,
});

export type { ComboBoxInputGroupProps, ComboBoxPopoverProps, ComboBoxProps, ComboBoxTriggerProps };
export default ComboBox;
