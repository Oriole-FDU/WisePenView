import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { UploadZone } from '@/components/base/Input';

interface CourseCoverModalProps {
  isOpen: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onFileChange: (file: File | null) => void;
  onConfirm: () => void;
}

function CourseCoverModal({
  isOpen,
  file,
  onOpenChange,
  onFileChange,
  onConfirm,
}: CourseCoverModalProps) {
  const { t } = useTranslation('course');

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('editor.actions.changeCover')}
      actions={
        <>
          <AppButton variant="secondary" onPress={() => onOpenChange(false)}>
            {t('editor.actions.cancel')}
          </AppButton>
          <AppButton variant="primary" isDisabled={!file} onPress={onConfirm}>
            {t('editor.actions.confirm')}
          </AppButton>
        </>
      }
    >
      <UploadZone
        file={file}
        accept="image/*"
        label={t('editor.fields.coverUpload')}
        onFileChange={onFileChange}
      />
    </AppModal>
  );
}

export default CourseCoverModal;
