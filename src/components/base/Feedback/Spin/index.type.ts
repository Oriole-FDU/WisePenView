import type { Spinner } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';

export type SpinSize = 'small' | 'default' | 'large';
export type HeroSpinnerSize = ComponentProps<typeof Spinner>['size'];

export interface SpinProps {
  /** 用于内联图标或局部覆盖层加载；带 children 时渲染遮罩。 */
  size?: SpinSize;
  spinning?: boolean;
  tip?: ReactNode;
  children?: ReactNode;
  className?: string;
}
