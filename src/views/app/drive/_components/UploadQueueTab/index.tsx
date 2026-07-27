import {
  useDriveUploadQueueStore,
  type DriveUploadQueueItem,
} from '@/components/Drive/_store/useDriveUploadQueueStore';
import { DataTable, type DataTableColumn } from '@/components/Table';
import { useDocumentService } from '@/domains';
import type { DocumentProcessStatus, PendingDocItem } from '@/domains/Document';
import {
  DOCUMENT_PROCESS,
  isDocumentCancelableStatus,
  isDocumentRetryableStatus,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, ProgressBar, toast } from '@heroui/react';
import { useInterval, useMount, useRequest, useUnmount } from 'ahooks';
import type { TFunction } from 'i18next';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

const REFRESH_INTERVAL_MS = 5000;
const COMPLETED_ROW_VISIBLE_DELAY_MS = 1500;

type UploadProgressPresentation =
  | { kind: 'loading'; label: string }
  | { kind: 'progress'; label: string; progress: number }
  | { kind: 'done'; label: string }
  | { kind: 'error'; label: string };

type UploadQueueRow = {
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

function UploadQueueTab() {
  const { t } = useTranslation(['drive', 'common']);
  const documentService = useDocumentService();
  const localUploads = useDriveUploadQueueStore((state) => state.uploads);
  const completedRowKeysRef = useRef<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<PendingDocItem[]>([]);
  const [completedRows, setCompletedRows] = useState<UploadQueueRow[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const hasActiveLocalUploads = localUploads.some(isActiveLocalUpload);

  const enqueueCompletedRows = (rows: UploadQueueRow[]) => {
    const freshRows = rows.filter((row) => {
      if (completedRowKeysRef.current.has(row.queueRowKey)) return false;
      completedRowKeysRef.current.add(row.queueRowKey);
      return true;
    });
    if (freshRows.length === 0) return;

    setCompletedRows((prev) => [...prev, ...freshRows]);
    const rowKeys = new Set(freshRows.map((row) => row.queueRowKey));
    window.setTimeout(() => {
      setCompletedRows((prev) => prev.filter((row) => !rowKeys.has(row.queueRowKey)));
    }, COMPLETED_ROW_VISIBLE_DELAY_MS);
  };

  const {
    run: runFetchPendingList,
    loading: listLoading,
    cancel: cancelPolling,
  } = useRequest(async () => documentService.listPendingDocs(), {
    manual: true,
    onSuccess: (nextItems) => {
      const readyRows = nextItems.flatMap((item, index) =>
        item.documentStatus.status === DOCUMENT_PROCESS.READY
          ? [mapCompletedPendingItemToRow(item, index, t)]
          : []
      );
      const nextPendingItems = nextItems.filter(
        (item) => item.documentStatus.status !== DOCUMENT_PROCESS.READY
      );

      setPendingItems(nextPendingItems);
      if (readyRows.length > 0) {
        removeMatchingLocalUploads(readyRows);
        enqueueCompletedRows(readyRows);
      }
      setPollingActive(
        nextPendingItems.some((item) => !isDocumentTerminalStatus(item.documentStatus.status))
      );
    },
    onError: (err) => {
      setPollingActive(false);
      toast.danger(parseErrorMessage(err));
    },
  });

  const { run: runRetryPendingDoc } = useRequest(
    async (documentId: string) => {
      await documentService.retryPendingDoc(documentId);
    },
    {
      manual: true,
      onBefore: ([documentId]) => {
        setRetryingId(documentId ?? null);
      },
      onSuccess: () => {
        toast.success(t('uploadQueue.feedback.retrySubmitted'));
        runFetchPendingList();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setRetryingId(null);
      },
    }
  );

  const { run: runCancelPendingDoc } = useRequest(
    async (documentId: string) => {
      await documentService.cancelPendingDoc(documentId);
    },
    {
      manual: true,
      onBefore: ([documentId]) => {
        setCancelingId(documentId ?? null);
      },
      onSuccess: () => {
        toast.success(t('uploadQueue.feedback.canceled'));
        runFetchPendingList();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setCancelingId(null);
      },
    }
  );

  useMount(() => {
    runFetchPendingList();
  });

  useInterval(
    () => {
      if (!listLoading) {
        runFetchPendingList();
      }
    },
    pollingActive || hasActiveLocalUploads ? REFRESH_INTERVAL_MS : undefined
  );

  useUnmount(() => {
    cancelPolling();
  });

  const items = buildUploadQueueRows(localUploads, pendingItems, completedRows, t);

  const columns = [
    {
      id: 'filename',
      label: t('uploadQueue.columns.filename'),
      width: 'fill',
      isRowHeader: true,
      renderCell: (row) => (
        <span className={styles.nameText}>{row.documentName || t('node.unnamedDocument')}</span>
      ),
    },
    {
      id: 'fileType',
      label: t('uploadQueue.columns.type'),
      width: 'sm',
      renderCell: (row) => formatFileType(row.fileType),
    },
    {
      id: 'size',
      label: t('uploadQueue.columns.size'),
      width: 'sm',
      renderCell: (row) => formatFileSize(row.size),
    },
    {
      id: 'progress',
      label: t('uploadQueue.columns.progress'),
      width: 'lg',
      renderCell: (row) => <UploadProgressCell row={row} />,
    },
    {
      id: 'action',
      label: '',
      width: 'md',
      align: 'end',
      renderCell: (row) => {
        if (!row.retryable && !row.cancelable) return null;
        return (
          <div className={styles.actionGroup}>
            {row.retryable ? (
              <Button
                variant="ghost"
                size="sm"
                isDisabled={retryingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runRetryPendingDoc(row.documentId);
                }}
              >
                {t('actions.retry', { ns: 'common' })}
              </Button>
            ) : null}
            {row.cancelable ? (
              <Button
                variant="danger"
                size="sm"
                isDisabled={cancelingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runCancelPendingDoc(row.documentId);
                }}
              >
                {t('actions.cancel', { ns: 'common' })}
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ] satisfies DataTableColumn<UploadQueueRow>[];

  return (
    <div className={styles.wrapper}>
      <main className={styles.listArea}>
        <DataTable<UploadQueueRow>
          ariaLabel={t('uploadQueue.aria')}
          rowKey="queueRowKey"
          items={items}
          columns={columns}
          loading={listLoading}
          emptyText={t('uploadQueue.empty')}
          summary={false}
        />
      </main>
    </div>
  );
}

function UploadProgressCell({ row }: { row: UploadQueueRow }) {
  const { t } = useTranslation('drive');
  const { presentation } = row;

  if (presentation.kind === 'done') {
    return (
      <div className={styles.statusLine} role="status">
        <span className={styles.progressLabel}>{presentation.label}</span>
        <CircleCheck className={styles.doneIcon} aria-hidden="true" size={17} strokeWidth={2} />
      </div>
    );
  }

  if (presentation.kind === 'error') {
    return (
      <div className={styles.statusLine}>
        <span className={styles.errorLabel} title={presentation.label}>
          {presentation.label}
        </span>
        <CircleAlert className={styles.errorIcon} aria-hidden="true" size={17} strokeWidth={2} />
      </div>
    );
  }

  const isLoading = presentation.kind === 'loading';

  return (
    <div className={styles.progressCell} aria-busy={isLoading || undefined}>
      <div className={styles.progressMeta}>
        <span className={styles.progressLabel} title={presentation.label}>
          {presentation.label}
        </span>
        {presentation.kind === 'progress' ? (
          <span className={styles.progressValue}>{presentation.progress}%</span>
        ) : null}
      </div>
      <ProgressBar
        aria-label={t('uploadQueue.status.progressAria', {
          name: row.documentName || t('node.unnamedDocument'),
          status: presentation.label,
        })}
        color="accent"
        isIndeterminate={isLoading}
        size="sm"
        value={presentation.kind === 'progress' ? presentation.progress : undefined}
      >
        <ProgressBar.Track className={styles.progressTrack}>
          <ProgressBar.Fill className={styles.progressFill} />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

function buildUploadQueueRows(
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

function mapCompletedPendingItemToRow(
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

function isActiveLocalUpload(upload: DriveUploadQueueItem): boolean {
  return (
    upload.phase === 'hashing' || upload.phase === 'uploading' || upload.phase === 'confirming'
  );
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

function removeMatchingLocalUploads(rows: UploadQueueRow[]): void {
  const completedDocumentIds = new Set(
    rows.flatMap((row) => (row.documentId ? [row.documentId] : []))
  );
  if (completedDocumentIds.size === 0) return;

  const { uploads, removeUpload } = useDriveUploadQueueStore.getState();
  uploads.forEach((upload) => {
    if (upload.documentId && completedDocumentIds.has(upload.documentId)) {
      removeUpload(upload.id);
    }
  });
}

function formatFileType(fileType: string): string {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
}

export default UploadQueueTab;
