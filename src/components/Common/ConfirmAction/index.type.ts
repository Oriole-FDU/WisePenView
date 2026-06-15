import type { ReactElement, ReactNode } from 'react';

export interface ConfirmActionProps {
  title: ReactNode;
  children: ReactElement;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}
