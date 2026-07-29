import { useDriveUploadQueueStore } from '@/components/Drive/_store/useDriveUploadQueueStore';
import { useDocumentService } from '@/domains';
import type { PendingDocItem } from '@/domains/Document';
import { DOCUMENT_PROCESS, isDocumentTerminalStatus } from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useInterval, useMount, useRequest, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildUploadQueueRows,
  isActiveLocalUpload,
  mapCompletedPendingItemToRow,
  type UploadQueueRow,
} from './uploadQueueModel';

const REFRESH_INTERVAL_MS = 5000;
const COMPLETED_ROW_VISIBLE_DELAY_MS = 1500;

export function useUploadQueue() {
  const { t } = useTranslation('drive');
  const documentService = useDocumentService();
  const localUploads = useDriveUploadQueueStore((state) => state.uploads);
  const completedRowKeysRef = useRef<Set<string>>(new Set());
  const completedRowTimerIdsRef = useRef<Set<number>>(new Set());
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

    setCompletedRows((previousRows) => [...previousRows, ...freshRows]);
    const rowKeys = new Set(freshRows.map((row) => row.queueRowKey));
    const timerId = window.setTimeout(() => {
      completedRowTimerIdsRef.current.delete(timerId);
      setCompletedRows((previousRows) =>
        previousRows.filter((row) => !rowKeys.has(row.queueRowKey))
      );
    }, COMPLETED_ROW_VISIBLE_DELAY_MS);
    completedRowTimerIdsRef.current.add(timerId);
  };

  const {
    run: fetchPendingList,
    loading: listLoading,
    cancel: cancelListRequest,
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
    onError: (error) => {
      setPollingActive(false);
      toast.danger(parseErrorMessage(error));
    },
  });

  const { run: retryPendingDoc, cancel: cancelRetryRequest } = useRequest(
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
        fetchPendingList();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
      onFinally: () => {
        setRetryingId(null);
      },
    }
  );

  const { run: cancelPendingDoc, cancel: cancelCancelRequest } = useRequest(
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
        fetchPendingList();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
      onFinally: () => {
        setCancelingId(null);
      },
    }
  );

  useMount(() => {
    fetchPendingList();
  });

  useInterval(
    () => {
      if (!listLoading) {
        fetchPendingList();
      }
    },
    pollingActive || hasActiveLocalUploads ? REFRESH_INTERVAL_MS : undefined
  );

  useUnmount(() => {
    cancelListRequest();
    cancelRetryRequest();
    cancelCancelRequest();
    completedRowTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    completedRowTimerIdsRef.current.clear();
  });

  return {
    items: buildUploadQueueRows(localUploads, pendingItems, completedRows, t),
    listLoading,
    retryingId,
    cancelingId,
    retryPendingDoc,
    cancelPendingDoc,
  };
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
