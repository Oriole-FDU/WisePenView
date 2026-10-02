import type {
  ComboBoxInputGroupProps as HeroComboBoxInputGroupProps,
  ComboBoxPopoverProps as HeroComboBoxPopoverProps,
  ComboBoxProps as HeroComboBoxProps,
  ComboBoxTriggerProps as HeroComboBoxTriggerProps,
} from '@heroui/react';
import type { ReactNode } from 'react';

export interface ComboBoxProps<T extends object = object> extends HeroComboBoxProps<T> {
  /** 顶部标签，与 Select 保持同一套字段结构 */
  label?: ReactNode;
  labelClassName?: string;
}

export type ComboBoxInputGroupProps = HeroComboBoxInputGroupProps;
export type ComboBoxTriggerProps = HeroComboBoxTriggerProps;
export type ComboBoxPopoverProps = HeroComboBoxPopoverProps;
