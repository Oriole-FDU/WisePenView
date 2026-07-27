import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '../AppAlertDialog';
import type { UnsavedChangesDialogProps } from './index.type';

function UnsavedChangesDialog({
  type = 'confirm',
  isOpen,
  isLoading = false,
  title,
  description,
  cancelText,
  discardText,
  confirmText,
  onCancel,
  onDiscard,
  onConfirm,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation('common');
  const resolvedCancelText = cancelText ?? t('actions.cancel');
  const resolvedDiscardText = discardText ?? t('overlay.discard');
  const actions = onDiscard ? (
    <>
      <Button variant="secondary" isDisabled={isLoading} onPress={onCancel}>
        {resolvedCancelText}
      </Button>
      <Button variant="secondary" isDisabled={isLoading} onPress={onDiscard}>
        {resolvedDiscardText}
      </Button>
      <Button variant="primary" isDisabled={isLoading} aria-busy={isLoading} onPress={onConfirm}>
        {confirmText}
      </Button>
    </>
  ) : undefined;

  return (
    <AppAlertDialog
      type={type}
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open && !isLoading) onCancel();
      }}
      title={title}
      description={description}
      cancelText={resolvedCancelText}
      confirmText={confirmText}
      actions={actions}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isConfirmLoading={isLoading}
      isDismissable={!isLoading}
    />
  );
}

export default UnsavedChangesDialog;
