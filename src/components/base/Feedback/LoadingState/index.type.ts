import type { Spinner } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';

export interface LoadingStateProps {
  /** 用于整块区域的加载状态，适合页面、列表或消息流占位。 */
  label?: ReactNode;
  size?: ComponentProps<typeof Spinner>['size'];
  className?: string;
}
