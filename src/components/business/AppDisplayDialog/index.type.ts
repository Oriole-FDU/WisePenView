import type { ComponentProps, ReactNode } from 'react';

import type { AppButtonProps } from '@/components/base/Button';
import type { Modal } from '@/components/base/Modal';

export type AppDisplayDialogSize = ComponentProps<typeof Modal.Container>['size'];

export type AppDisplayDialogPlacement = ComponentProps<typeof Modal.Container>['placement'];

export type AppDisplayDialogButtonVariant = AppButtonProps['variant'];

export interface AppDisplayDialogAction extends Omit<AppButtonProps, 'children' | 'variant'> {
  label: ReactNode;
  icon?: ReactNode;
  variant?: AppDisplayDialogButtonVariant;
}

export interface AppDisplayDialogClassNames {
  container?: string;
  dialog?: string;
  closeTrigger?: string;
  header?: string;
  heading?: string;
  description?: string;
  body?: string;
  footer?: string;
}

export interface AppDisplayDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  closeText?: ReactNode | false | null;
  primaryAction?: AppDisplayDialogAction;
  secondaryAction?: AppDisplayDialogAction;
  actions?: ReactNode;
  footer?: ReactNode | false | null;
  size?: AppDisplayDialogSize;
  placement?: AppDisplayDialogPlacement;
  isDismissable?: boolean;
  showCloseTrigger?: boolean;
  contentDelay?: number;
  deferContent?: boolean;
  className?: string;
  containerClassName?: string;
  dialogClassName?: string;
  closeTriggerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  classNames?: AppDisplayDialogClassNames;
}

export type AppDisplayDialogBodyProps = ComponentProps<typeof Modal.Body>;

export type AppDisplayDialogFooterProps = ComponentProps<typeof Modal.Footer>;
