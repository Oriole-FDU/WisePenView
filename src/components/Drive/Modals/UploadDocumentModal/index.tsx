import {
  getSupportedDriveDocumentFiles,
  useDriveDocumentUpload,
} from '@/components/Drive/common/useDriveDocumentUpload';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { Button, toast } from '@heroui/react';
import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UploadDocumentModalProps } from './index.type';
import styles from './style.module.less';

const ACCEPT_DOCUMENT_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

/** 文档上传：MD5 -> init -> OSS PUT；后端注册成功后挂载到指定目录。 */
function UploadDocumentModal({
  isOpen,
  pathTagId,
  onOpenChange,
  onSuccess,
}: UploadDocumentModalProps) {
  const { t } = useTranslation(['drive', 'common']);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { queueDocuments } = useDriveDocumentUpload({ pathTagId, onSuccess });

  const resetState = () => {
    setSelectedFiles([]);
  };

  const handleFilesChange = (files: File[]) => {
    const supportedFiles = getSupportedDriveDocumentFiles(files);
    if (supportedFiles.length !== files.length) {
      toast.warning(t('upload.feedback.unsupportedType'));
    }
    setSelectedFiles(supportedFiles);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleOk = () => {
    if (selectedFiles.length === 0) {
      toast.warning(t('upload.feedback.selectFile'));
      return;
    }
    const filesToUpload = selectedFiles;
    queueDocuments(filesToUpload);
    toast.success(t('upload.feedback.queued', { count: filesToUpload.length }));
    resetState();
    onOpenChange(false);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('upload.title')}
      description={t('upload.description')}
      size="lg"
      containerClassName={styles.container}
      dialogClassName={styles.dialog}
      bodyClassName={styles.body}
      actions={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <X size={14} strokeWidth={1.8} />
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button variant="primary" isDisabled={selectedFiles.length === 0} onPress={handleOk}>
            <CloudUpload size={15} strokeWidth={1.8} />
            {t('upload.addToQueue')}
          </Button>
        </>
      }
    >
      <UploadZone
        files={selectedFiles}
        multiple
        accept={ACCEPT_DOCUMENT_TYPES}
        label={t('upload.zoneLabel')}
        description={t('upload.zoneDescription')}
        onFilesChange={handleFilesChange}
      />

      <div className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <div className={styles.statusTitle}>
            <span>{t('upload.limits')}</span>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

export default UploadDocumentModal;
