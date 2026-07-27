import type { ComponentProps, ReactNode } from 'react';

import type { Popover, PopoverRootProps } from '../Popover';

export type AppPopoverVariant = 'default' | 'danger';

export type AppPopoverBodyPadding = 'default' | 'none';

export interface AppPopoverClassNames {
  dialog?: string;
  header?: string;
  heading?: string;
  body?: string;
  arrow?: string;
}

export interface AppPopoverContentProps extends Omit<
  ComponentProps<typeof Popover.Content>,
  'children'
> {
  title?: ReactNode;
  variant?: AppPopoverVariant;
  bodyPadding?: AppPopoverBodyPadding;
  showArrow?: boolean;
  children?: ReactNode;
  classNames?: AppPopoverClassNames;
}

export interface AppPopoverHeaderProps extends ComponentProps<'div'> {
  variant?: AppPopoverVariant;
  icon?: ReactNode | false;
}

export type AppPopoverProps = PopoverRootProps;
