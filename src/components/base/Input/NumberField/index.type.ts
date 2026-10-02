import type {
  NumberFieldDecrementButtonProps as HeroNumberFieldDecrementButtonProps,
  NumberFieldGroupProps as HeroNumberFieldGroupProps,
  NumberFieldIncrementButtonProps as HeroNumberFieldIncrementButtonProps,
  NumberFieldInputProps as HeroNumberFieldInputProps,
  NumberFieldProps as HeroNumberFieldProps,
} from '@heroui/react';
import type { ReactNode } from 'react';

export interface NumberFieldProps extends HeroNumberFieldProps {
  /** 顶部标签，与其它字段控件保持同一套字段结构 */
  label?: ReactNode;
  labelClassName?: string;
}

export type NumberFieldGroupProps = HeroNumberFieldGroupProps;
export type NumberFieldInputProps = HeroNumberFieldInputProps;
export type NumberFieldIncrementButtonProps = HeroNumberFieldIncrementButtonProps;
export type NumberFieldDecrementButtonProps = HeroNumberFieldDecrementButtonProps;
