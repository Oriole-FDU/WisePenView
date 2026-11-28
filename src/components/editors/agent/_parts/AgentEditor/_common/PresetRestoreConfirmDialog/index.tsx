import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';

import type { PresetRestoreConfirmDialogProps } from './index.type';

export default function PresetRestoreConfirmDialog({
  isOpen,
  title,
  description,
  onOpenChange,
  onConfirm,
}: PresetRestoreConfirmDialogProps) {
  const { t } = useTranslation(['agent', 'common']);

  return (
    <AppAlertDialog
      type="warning"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      cancelText={t('common:actions.cancel')}
      confirmText={t('agent:common.restorePreset')}
      onConfirm={onConfirm}
      isDismissable
    />
  );
}
