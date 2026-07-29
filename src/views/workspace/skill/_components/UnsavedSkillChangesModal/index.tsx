import { UnsavedChangesDialog } from '@/components/Overlay';
import { useTranslation } from 'react-i18next';

export type UnsavedSkillChangesMode = 'publish' | 'leave' | 'switchVersion' | 'cancelEditing';

interface UnsavedSkillChangesModalProps {
  isOpen: boolean;
  mode: UnsavedSkillChangesMode;
  isLoading?: boolean;
  onCancel: () => void;
  onDiscard?: () => void;
  onConfirm: () => void;
}

function UnsavedSkillChangesModal({
  isOpen,
  mode,
  isLoading = false,
  onCancel,
  onDiscard,
  onConfirm,
}: UnsavedSkillChangesModalProps) {
  const { t } = useTranslation('skill');
  const copy = {
    title: t(`unsaved.${mode}.title`),
    description: t(`unsaved.${mode}.description`),
    confirmText: t(`unsaved.${mode}.confirm`),
    cancelText: mode === 'cancelEditing' ? t('unsaved.cancelEditing.cancel') : undefined,
    discardText: mode === 'cancelEditing' ? t('unsaved.cancelEditing.discard') : undefined,
  };

  return (
    <UnsavedChangesDialog
      type="confirm"
      isOpen={isOpen}
      isLoading={isLoading}
      title={copy.title}
      description={copy.description}
      confirmText={copy.confirmText}
      cancelText={copy.cancelText}
      discardText={copy.discardText}
      onCancel={onCancel}
      onDiscard={onDiscard}
      onConfirm={onConfirm}
    />
  );
}

export default UnsavedSkillChangesModal;
