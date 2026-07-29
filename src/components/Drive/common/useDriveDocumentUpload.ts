import { useDriveUploadQueueStore } from '@/components/Drive/_store/useDriveUploadQueueStore';
import { useDocumentService } from '@/domains';
import type { DocumentProcessStatus } from '@/domains/Document';
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_PROCESS,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { parseExtension } from '@/utils/parser/extensionParser';
import { createUuid } from '@/utils/random/createUuid';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const DOCUMENT_ALLOWED_EXTENSION_SET = new Set<string>(DOCUMENT_ALLOWED_EXTENSIONS);
const UPLOAD_STATUS_SYNC_DELAY_MS = 3000;
const QUEUE_DONE_VISIBLE_DELAY_MS = 900;
const PROCESS_STATUS_SYNC_INTERVAL_MS = 2000;
const PROCESS_STATUS_SYNC_MAX_ATTEMPTS = 15;

interface UseDriveDocumentUploadParams {
  pathTagId?: string;
  onSuccess?: () => void;
}

const getDocumentStatusLabel = (status: string, t: TFunction<'drive'>): string =>
  t(`uploadQueue.status.document.${status}`, { defaultValue: status });

export const getSupportedDriveDocumentFiles = (files: File[]): File[] =>
  files.filter(isSupportedDocument);

/** 将本地文档加入 Drive 上传队列，并在后端处理完成后刷新当前目录。 */
export function useDriveDocumentUpload({ pathTagId, onSuccess }: UseDriveDocumentUploadParams) {
  const { t } = useTranslation('drive');
  const documentService = useDocumentService();
  const startUploads = useDriveUploadQueueStore((state) => state.startUploads);
  const updateQueuedUpload = useDriveUploadQueueStore((state) => state.updateUpload);
  const removeQueuedUpload = useDriveUploadQueueStore((state) => state.removeUpload);

  const completeQueuedUpload = (uploadId: string) => {
    updateQueuedUpload(uploadId, { phase: 'done' });
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
      void settleUploadedDocument(documentId, uploadId).catch((error: unknown) => {
        removeQueuedUpload(uploadId);
        toast.warning(t('upload.feedback.statusUnknown', { message: parseErrorMessage(error) }));
      });
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const { run: queueDocuments } = useRequest(
    async (files: File[], targetPathTagId?: string) => {
      const uploadPathTagId = targetPathTagId ?? pathTagId;
      if (!uploadPathTagId) return 0;

      const supportedFiles = getSupportedDriveDocumentFiles(files);
      if (supportedFiles.length !== files.length) {
        toast.warning(t('upload.feedback.unsupportedType'));
      }
      if (supportedFiles.length === 0) return 0;

      const uploadIds = supportedFiles.map(() => createUuid());
      startUploads(
        supportedFiles.map((file, index) => ({
          id: uploadIds[index],
          filename: file.name,
          fileType: getDisplayFileType(file),
          size: file.size,
          phase: 'hashing',
          progress: 0,
        }))
      );

      await Promise.all(
        supportedFiles.map(async (file, index) => {
          const uploadId = uploadIds[index];
          try {
            const documentId = await documentService.uploadDocument({
              file,
              pathTagId: uploadPathTagId,
              onUploadInitialized: (payload) => {
                updateQueuedUpload(uploadId, {
                  documentId: payload.documentId,
                  phase: payload.flashUploaded ? 'confirming' : 'uploading',
                  progress: 0,
                });
              },
              onUploadProgress: (progress) => {
                updateQueuedUpload(uploadId, { phase: 'uploading', progress });
              },
            });
            updateQueuedUpload(uploadId, { documentId, phase: 'confirming' });
            scheduleUploadSettlement(documentId, uploadId);
          } catch (error) {
            updateQueuedUpload(uploadId, {
              phase: 'failed',
              errorMessage: parseErrorMessage(error),
            });
            throw error;
          }
        })
      );

      return supportedFiles.length;
    },
    {
      manual: true,
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  return { queueDocuments };
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
