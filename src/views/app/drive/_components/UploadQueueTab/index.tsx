import { Empty } from '@/components/Common/Feedback';
import { DataTable, type DataTableColumn } from '@/components/Table';
import { useDocumentService } from '@/domains';
import type { PendingDocItem } from '@/domains/Document';
import {
  DOCUMENT_PROCESS,
  isDocumentCancelableStatus,
  isDocumentRetryableStatus,
  isDocumentTerminalStatus,
} from '@/domains/Document';
import { parseErrorMessage } from '@/utils/error';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, toast } from '@heroui/react';
import { useInterval, useMount, useRequest, useUnmount } from 'ahooks';
import { useImperativeHandle, useMemo, useState, type Ref } from 'react';
import styles from './style.module.less';

const SYNC_INTERVAL_MS = 5000;

const formatFileType = (fileType: string): string => {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
};

type UploadQueueRow = PendingDocItem & {
  queueRowKey: string;
};

export interface UploadQueueTabRef {
  refresh: () => void;
}

function UploadQueueTab({ ref }: { ref?: Ref<UploadQueueTabRef> }) {
  const documentService = useDocumentService();
  const [list, setList] = useState<PendingDocItem[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const {
    run: runFetchPendingList,
    loading: listLoading,
    cancel: cancelPolling,
  } = useRequest(
    async (withSync: boolean) => {
      if (withSync) {
        const current = await documentService.listPendingDocs();
        const nonTerminalItems = current.filter(
          (item) => !isDocumentTerminalStatus(item.documentStatus.status)
        );
        await Promise.all(
          nonTerminalItems
            .filter((item) => item.documentId != null && item.documentId !== '')
            .map((item) => documentService.syncPendingDocStatus(item.documentId as string))
        );
      }
      return await documentService.listPendingDocs();
    },
    {
      manual: true,
      onSuccess: (nextList) => {
        setList(nextList);
        setPollingActive(
          nextList.some((item) => !isDocumentTerminalStatus(item.documentStatus.status))
        );
      },
      onError: (err) => {
        setPollingActive(false);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { run: runRetryPendingDoc } = useRequest(
    async (documentId: string) => {
      await documentService.retryPendingDoc(documentId);
      return documentId;
    },
    {
      manual: true,
      onBefore: (params) => {
        setRetryingId(params[0] ?? null);
      },
      onSuccess: () => {
        toast.success('已提交重试');
        runFetchPendingList(false);
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
      return documentId;
    },
    {
      manual: true,
      onBefore: (params) => {
        setCancelingId(params[0] ?? null);
      },
      onSuccess: () => {
        toast.success('已取消处理');
        runFetchPendingList(false);
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
    runFetchPendingList(false);
  });

  useInterval(
    () => {
      if (listLoading) return;
      runFetchPendingList(true);
    },
    pollingActive ? SYNC_INTERVAL_MS : undefined
  );

  useUnmount(() => {
    cancelPolling();
  });

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        runFetchPendingList(false);
      },
    }),
    [runFetchPendingList]
  );

  const items = useMemo<UploadQueueRow[]>(
    () =>
      list.map((item, index) => ({
        ...item,
        queueRowKey:
          item.documentId ??
          `${item.uploadMeta.documentName}-${item.uploadMeta.uploaderId ?? 'unknown'}-${String(index)}`,
      })),
    [list]
  );

  const columns = useMemo<DataTableColumn<UploadQueueRow>[]>(
    () => [
      {
        id: 'filename',
        label: '文件名',
        width: 'fill',
        isRowHeader: true,
        renderCell: (row) => (
          <span className={styles.nameText}>{row.uploadMeta.documentName || '未命名文档'}</span>
        ),
      },
      {
        id: 'fileType',
        label: '类型',
        width: 'sm',
        renderCell: (row) => formatFileType(row.uploadMeta.fileType),
      },
      {
        id: 'size',
        label: '大小',
        width: 'sm',
        renderCell: (row) => formatFileSize(row.uploadMeta.size),
      },
      {
        id: 'status',
        label: '状态',
        width: 'md',
        renderCell: (row) => DOCUMENT_PROCESS.getLabel(row.documentStatus.status),
      },
      {
        id: 'action',
        label: '',
        width: 'md',
        align: 'end',
        renderCell: (row) => {
          const status = row.documentStatus.status;
          const hasDocumentId = row.documentId != null && row.documentId !== '';
          const retryDisabled = !hasDocumentId || !isDocumentRetryableStatus(status);
          const cancelDisabled = !hasDocumentId || !isDocumentCancelableStatus(status);
          return (
            <div className={styles.actionGroup}>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={retryDisabled || retryingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runRetryPendingDoc(row.documentId);
                }}
              >
                重试
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={cancelDisabled || cancelingId === row.documentId}
                onPress={() => {
                  if (row.documentId) runCancelPendingDoc(row.documentId);
                }}
              >
                取消
              </Button>
            </div>
          );
        },
      },
    ],
    [retryingId, cancelingId, runRetryPendingDoc, runCancelPendingDoc]
  );

  return (
    <div className={styles.wrapper}>
      <main className={styles.listArea}>
        <DataTable<UploadQueueRow>
          ariaLabel="上传队列"
          rowKey="queueRowKey"
          items={items}
          columns={columns}
          loading={listLoading}
          emptyText="暂无上传队列"
          emptyIcon={<Empty description="暂无上传队列" />}
          summary={false}
        />
      </main>
    </div>
  );
}

export default UploadQueueTab;
