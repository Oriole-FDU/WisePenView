import type { DriveUploadQueueItem } from '@/components/Drive/_store/useDriveUploadQueueStore';
import type { DocumentProcessStatus, PendingDocItem } from '@/domains/Document';
import {
  DOCUMENT_PROCESS,
  isDocumentCancelableStatus,
  isDocumentRetryableStatus,
} from '@/domains/Document';
import type { TFunction } from 'i18next';

export type UploadProgressPresentation =
  | { kind: 'loading'; label: string }
  | { kind: 'progress'; label: string; progress: number }
  | { kind: 'done'; label: string }
  | { kind: 'error'; label: string };

export type UploadQueueRow = {
  queueRowKey: string;
  documentId?: string;
  documentName: string;
  fileType: string;
  size: number;
  presentation: UploadProgressPresentation;
  retryable: boolean;
  cancelable: boolean;
};

const documentStatusKeyMap: Record<string, string> = {
  [DOCUMENT_PROCESS.UPLOADING]: 'uploadQueue.status.document.UPLOADING',
  [DOCUMENT_PROCESS.UPLOADED]: 'uploadQueue.status.document.UPLOADED',
  [DOCUMENT_PROCESS.CONVERTING_AND_PARSING]: 'uploadQueue.status.document.CONVERTING_AND_PARSING',
  [DOCUMENT_PROCESS.REGISTERING_RES]: 'uploadQueue.status.document.REGISTERING_RES',
  [DOCUMENT_PROCESS.READY]: 'uploadQueue.status.document.READY',
  [DOCUMENT_PROCESS.TRANSFER_TIMEOUT]: 'uploadQueue.status.document.TRANSFER_TIMEOUT',
  [DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT]: 'uploadQueue.status.document.REGISTERING_RES_TIMEOUT',
  [DOCUMENT_PROCESS.FAILED]: 'uploadQueue.status.document.FAILED',
};

export function buildUploadQueueRows(
  localUploads: DriveUploadQueueItem[],
  pendingItems: PendingDocItem[],
  completedRows: UploadQueueRow[],
  t: TFunction<'drive'>
): UploadQueueRow[] {
  const localUploadByDocumentId = new Map<string, DriveUploadQueueItem>();
  localUploads.forEach((upload) => {
    if (upload.documentId) {
      localUploadByDocumentId.set(upload.documentId, upload);
    }
  });

  const backendDocumentIds = new Set(
    [...pendingItems, ...completedRows].flatMap((item) =>
      item.documentId ? [item.documentId] : []
    )
  );
  const localRows = localUploads
    .filter((upload) => !upload.documentId || !backendDocumentIds.has(upload.documentId))
    .map((upload) => mapLocalUploadToRow(upload, t));
  const pendingRows = pendingItems.map((item, index) =>
    mapPendingItemToRow(
      item,
      index,
      item.documentId ? localUploadByDocumentId.get(item.documentId) : undefined,
      t
    )
  );
  const activeRowKeys = new Set([...localRows, ...pendingRows].map((row) => row.queueRowKey));

  return [
    ...completedRows.filter((row) => !activeRowKeys.has(row.queueRowKey)),
    ...localRows,
    ...pendingRows,
  ];
}

export function mapCompletedPendingItemToRow(
  item: PendingDocItem,
  index: number,
  t: TFunction<'drive'>
): UploadQueueRow {
  return {
    queueRowKey: getPendingQueueRowKey(item, index),
    documentId: item.documentId,
    documentName: item.uploadMeta.documentName,
    fileType: item.uploadMeta.fileType,
    size: item.uploadMeta.size,
    presentation: { kind: 'done', label: t('uploadQueue.status.done') },
    retryable: false,
    cancelable: false,
  };
}

export function isActiveLocalUpload(upload: DriveUploadQueueItem): boolean {
  return (
    upload.phase === 'hashing' || upload.phase === 'uploading' || upload.phase === 'confirming'
  );
}

export function formatFileType(fileType: string): string {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
}

function mapLocalUploadToRow(upload: DriveUploadQueueItem, t: TFunction<'drive'>): UploadQueueRow {
  return {
    queueRowKey: `local:${upload.id}`,
    documentId: upload.documentId,
    documentName: upload.filename,
    fileType: upload.fileType,
    size: upload.size,
    presentation: resolveLocalUploadPresentation(upload, t),
    retryable: false,
    cancelable: false,
  };
}

function mapPendingItemToRow(
  item: PendingDocItem,
  index: number,
  localUpload: DriveUploadQueueItem | undefined,
  t: TFunction<'drive'>
): UploadQueueRow {
  const status = item.documentStatus.status;
  const hasDocumentId = Boolean(item.documentId);
  return {
    queueRowKey: getPendingQueueRowKey(item, index),
    documentId: item.documentId,
    documentName: item.uploadMeta.documentName,
    fileType: item.uploadMeta.fileType,
    size: item.uploadMeta.size,
    presentation: resolvePendingUploadPresentation(item.documentStatus, localUpload, t),
    retryable: hasDocumentId && isDocumentRetryableStatus(status),
    cancelable: hasDocumentId && isDocumentCancelableStatus(status),
  };
}

function resolveLocalUploadPresentation(
  upload: DriveUploadQueueItem,
  t: TFunction<'drive'>
): UploadProgressPresentation {
  if (upload.phase === 'hashing') {
    return { kind: 'loading', label: t('uploadQueue.status.hashing') };
  }
  if (upload.phase === 'uploading') {
    return {
      kind: 'progress',
      label: t('uploadQueue.status.uploading'),
      progress: upload.progress,
    };
  }
  if (upload.phase === 'confirming') {
    return { kind: 'loading', label: t('uploadQueue.status.processing') };
  }
  if (upload.phase === 'done') {
    return { kind: 'done', label: t('uploadQueue.status.done') };
  }
  return { kind: 'error', label: upload.errorMessage ?? t('uploadQueue.status.failed') };
}

function resolvePendingUploadPresentation(
  documentStatus: DocumentProcessStatus,
  localUpload: DriveUploadQueueItem | undefined,
  t: TFunction<'drive'>
): UploadProgressPresentation {
  if (localUpload?.phase === 'failed') {
    return { kind: 'error', label: localUpload.errorMessage ?? t('uploadQueue.status.failed') };
  }
  if (isFailedDocumentStatus(documentStatus.status)) {
    return {
      kind: 'error',
      label:
        documentStatus.errorMessage ??
        t(documentStatusKeyMap[documentStatus.status] ?? 'uploadQueue.status.document.FAILED'),
    };
  }
  if (documentStatus.status === DOCUMENT_PROCESS.READY || localUpload?.phase === 'done') {
    return { kind: 'done', label: t('uploadQueue.status.done') };
  }
  if (documentStatus.status === DOCUMENT_PROCESS.UPLOADING && localUpload?.phase === 'uploading') {
    return {
      kind: 'progress',
      label: t('uploadQueue.status.uploading'),
      progress: localUpload.progress,
    };
  }
  if (documentStatus.status === DOCUMENT_PROCESS.UPLOADING) {
    return { kind: 'loading', label: t('uploadQueue.status.uploading') };
  }
  return { kind: 'loading', label: t('uploadQueue.status.processing') };
}

function isFailedDocumentStatus(status: string): boolean {
  return (
    status === DOCUMENT_PROCESS.FAILED ||
    status === DOCUMENT_PROCESS.TRANSFER_TIMEOUT ||
    status === DOCUMENT_PROCESS.REGISTERING_RES_TIMEOUT
  );
}

function getPendingQueueRowKey(item: PendingDocItem, index: number): string {
  if (item.documentId) return `pending:${item.documentId}`;
  return `pending:${item.uploadMeta.documentName}:${item.uploadMeta.uploaderId ?? 'unknown'}:${String(index)}`;
}
