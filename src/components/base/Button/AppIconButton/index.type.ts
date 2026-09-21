import type { Button, Tooltip } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';

export interface AppIconButtonTooltipOptions {
  closeDelay?: Tooltip['Props']['closeDelay'];
  content?: ReactNode;
  delay?: Tooltip['Props']['delay'];
  offset?: Tooltip['ContentProps']['offset'];
  placement?: Tooltip['ContentProps']['placement'];
  showArrow?: Tooltip['ContentProps']['showArrow'];
  triggerClassName?: string;
}

export interface AppIconButtonProps extends Omit<
  ComponentProps<typeof Button>,
  | 'aria-label'
  | 'children'
  | 'className'
  | 'isIconOnly'
  | 'onPress'
  | 'render'
  | 'size'
  | 'type'
  | 'variant'
> {
  icon: ReactNode;
  label: string;
  className?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
  size?: 'xs' | 'sm' | 'md';
  toggleId?: string;
  tooltip?: AppIconButtonTooltipOptions;
  variant?: 'danger' | 'ghost' | 'primary';
}
