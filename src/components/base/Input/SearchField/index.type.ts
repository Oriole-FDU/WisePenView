import type { SearchFieldProps as HeroSearchFieldProps } from '@heroui/react';
import type { ReactNode } from 'react';

export interface SearchFieldProps extends HeroSearchFieldProps {
  /** 顶部标签，与 Select 保持同一套字段结构 */
  label?: ReactNode;
  labelClassName?: string;
}
