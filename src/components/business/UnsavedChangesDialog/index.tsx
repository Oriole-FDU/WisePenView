import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppAlertDialog from '@/components/business/AppAlertDialog';

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
      <AppButton variant="secondary" isDisabled={isLoading} onPress={onCancel}>
        {resolvedCancelText}
      </AppButton>
      <AppButton variant="secondary" isDisabled={isLoading} onPress={onDiscard}>
        {resolvedDiscardText}
      </AppButton>
      <AppButton variant="primary" isDisabled={isLoading} aria-busy={isLoading} onPress={onConfirm}>
        {confirmText}
      </AppButton>
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
