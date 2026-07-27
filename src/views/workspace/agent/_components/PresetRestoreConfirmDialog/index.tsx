import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useTranslation } from 'react-i18next';

interface PresetRestoreConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

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
