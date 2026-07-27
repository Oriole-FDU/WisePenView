import { useDriveUploadQueueStore } from '@/components/Drive/_store/useDriveUploadQueueStore';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useDocumentService } from '@/domains';
import type { DocumentProcessStatus } from '@/domains/Document';
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_PROCESS,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { DRIVE_UPLOAD_QUEUE_PATH } from '@/utils/navigation/driveRoute';
import { parseExtension } from '@/utils/parser/extensionParser';
import { createUuid } from '@/utils/random/createUuid';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { UploadDocumentModalProps } from './index.type';
import styles from './style.module.less';

const DOCUMENT_ALLOWED_EXTENSION_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);
const ACCEPT_DOCUMENT_TYPES = DOCUMENT_ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(
  ','
);

const UPLOAD_STATUS_SYNC_DELAY_MS = 3000;
const QUEUE_DONE_VISIBLE_DELAY_MS = 900;
const PROCESS_STATUS_SYNC_INTERVAL_MS = 2000;
const PROCESS_STATUS_SYNC_MAX_ATTEMPTS = 15;

const getDocumentStatusLabel = (status: string, t: TFunction<'drive'>): string =>
  t(`uploadQueue.status.document.${status}`, { defaultValue: status });

/** 文档上传：MD5 -> init -> OSS PUT；后端注册成功后保存在个人根目录。 */
function UploadDocumentModal({ isOpen, onOpenChange, onSuccess }: UploadDocumentModalProps) {
  const { t } = useTranslation(['drive', 'common']);
  const navigate = useNavigate();
  const documentService = useDocumentService();
  const startUploads = useDriveUploadQueueStore((s) => s.startUploads);
  const updateQueuedUpload = useDriveUploadQueueStore((s) => s.updateUpload);
  const removeQueuedUpload = useDriveUploadQueueStore((s) => s.removeUpload);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const resetState = () => {
    setSelectedFiles([]);
  };

  const handleFilesChange = (files: File[]) => {
    const supportedFiles = files.filter(isSupportedDocument);
    if (supportedFiles.length !== files.length) {
      toast.warning(t('upload.feedback.unsupportedType'));
    }
    setSelectedFiles(supportedFiles);
  };

  const completeQueuedUpload = (uploadId: string) => {
    updateQueuedUpload(uploadId, {
      phase: 'done',
    });
    window.setTimeout(() => {
      removeQueuedUpload(uploadId);
    }, QUEUE_DONE_VISIBLE_DELAY_MS);
  };

  const settleQueuedUpload = (uploadId: string, documentStatus: DocumentProcessStatus) => {
    if (documentStatus.status === DOCUMENT_PROCESS.READY) {
      completeQueuedUpload(uploadId);
      onSuccess?.();
      return;
    }
    updateQueuedUpload(uploadId, {
      phase: 'failed',
      errorMessage: documentStatus.errorMessage ?? getDocumentStatusLabel(documentStatus.status, t),
    });
  };

  const waitForDocumentTerminalStatus = async (
    documentId: string
  ): Promise<DocumentProcessStatus | null> => {
    for (let attempt = 1; attempt <= PROCESS_STATUS_SYNC_MAX_ATTEMPTS; attempt += 1) {
      const documentStatus = await documentService.syncPendingDocStatus(documentId);
      if (isDocumentTerminalStatus(documentStatus.status)) {
        return documentStatus;
      }
      if (attempt < PROCESS_STATUS_SYNC_MAX_ATTEMPTS) {
        await delay(PROCESS_STATUS_SYNC_INTERVAL_MS);
      }
    }
    return null;
  };

  const settleUploadedDocument = async (documentId: string, uploadId: string) => {
    const documentStatus = await waitForDocumentTerminalStatus(documentId);
    if (documentStatus == null) {
      removeQueuedUpload(uploadId);
      toast.warning(t('upload.feedback.stillProcessing'));
      return;
    }
    settleQueuedUpload(uploadId, documentStatus);
  };

  const scheduleUploadSettlement = (documentId: string, uploadId: string) => {
    window.setTimeout(() => {
      void settleUploadedDocument(documentId, uploadId).catch((err: unknown) => {
        removeQueuedUpload(uploadId);
        toast.warning(t('upload.feedback.statusUnknown', { message: parseErrorMessage(err) }));
      });
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const { run: submitUpload } = useRequest(
    async (files: File[]) => {
      if (files.length === 0) return 0;
      const uploadIds = files.map(() => createUuid());

      startUploads(
        files.map((file, index) => ({
          id: uploadIds[index],
          filename: file.name,
          fileType: getDisplayFileType(file),
          size: file.size,
          phase: 'hashing',
          progress: 0,
        }))
      );

      await Promise.all(
        files.map(async (file, index) => {
          const uploadId = uploadIds[index];
          try {
            const result = await documentService.uploadDocument({
              file,
              onUploadInitialized: (payload) => {
                updateQueuedUpload(uploadId, {
                  documentId: payload.documentId,
                  phase: payload.flashUploaded ? 'confirming' : 'uploading',
                  progress: 0,
                });
              },
              onUploadProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'uploading',
                  progress: p,
                });
              },
            });
            updateQueuedUpload(uploadId, {
              documentId: result,
              phase: 'confirming',
            });
            scheduleUploadSettlement(result, uploadId);
          } catch (err) {
            updateQueuedUpload(uploadId, {
              phase: 'failed',
              errorMessage: parseErrorMessage(err),
            });
            throw err;
          }
        })
      );

      return files.length;
    },
    {
      manual: true,
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

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
    submitUpload(filesToUpload);
    toast.success(t('upload.feedback.queued', { count: filesToUpload.length }));
    resetState();
    onOpenChange(false);
    navigate(DRIVE_UPLOAD_QUEUE_PATH);
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

function getDisplayFileType(file: File): string {
  try {
    return parseExtension(file.name);
  } catch {
    return 'unknown';
  }
}

function isSupportedDocument(file: File): boolean {
  try {
    return DOCUMENT_ALLOWED_EXTENSION_SET.has(parseExtension(file.name));
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default UploadDocumentModal;
