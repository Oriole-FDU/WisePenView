import type {
  AutocompleteClearButtonProps as HeroAutocompleteClearButtonProps,
  AutocompleteFilterProps as HeroAutocompleteFilterProps,
  AutocompleteIndicatorProps as HeroAutocompleteIndicatorProps,
  AutocompletePopoverProps as HeroAutocompletePopoverProps,
  AutocompleteProps as HeroAutocompleteProps,
  AutocompleteTriggerProps as HeroAutocompleteTriggerProps,
  AutocompleteValueProps as HeroAutocompleteValueProps,
} from '@heroui/react';
import type { ReactNode } from 'react';

export interface AutocompleteProps<
  T extends object = object,
  M extends 'single' | 'multiple' = 'single',
> extends HeroAutocompleteProps<T, M> {
  /** 顶部标签，与 Select 保持同一套字段结构 */
  label?: ReactNode;
  labelClassName?: string;
}

export type AutocompleteTriggerProps = HeroAutocompleteTriggerProps;
export type AutocompleteValueProps = HeroAutocompleteValueProps;
export type AutocompleteIndicatorProps = HeroAutocompleteIndicatorProps;
export type AutocompletePopoverProps = HeroAutocompletePopoverProps;
export type AutocompleteFilterProps = HeroAutocompleteFilterProps;
export type AutocompleteClearButtonProps = HeroAutocompleteClearButtonProps;
