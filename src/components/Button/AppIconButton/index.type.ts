import type { Tooltip } from '@heroui/react';
import type { ComponentPropsWithRef, MouseEventHandler, ReactElement, ReactNode } from 'react';

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
  ComponentPropsWithRef<'button'>,
  'aria-label' | 'children' | 'disabled' | 'onClick' | 'type'
> {
  icon: ReactNode;
  label: string;
  className?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onPress?: () => void;
  overlayTrigger?: ReactElement;
  size?: 'sm' | 'md';
  toggleId?: string;
  tooltip?: AppIconButtonTooltipOptions;
  variant?: 'danger' | 'ghost' | 'primary';
}
