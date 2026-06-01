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
import { Empty, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useImperativeHandle, useMemo, useState, type Ref } from 'react';
import styles from './style.module.less';

const SYNC_INTERVAL_MS = 5000;

const formatFileType = (fileType: string): string => {
  const value = fileType.toUpperCase();
  return value === '' ? 'UNKNOWN' : value;
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

  const columns = useMemo<ColumnsType<PendingDocItem>>(
    () => [
      {
        title: '文件名',
        dataIndex: ['uploadMeta', 'documentName'],
        key: 'filename',
        render: (value: string) => <span className={styles.nameText}>{value || '未命名文档'}</span>,
      },
      {
        title: '类型',
        dataIndex: ['uploadMeta', 'fileType'],
        key: 'fileType',
        width: 120,
        render: (value: string) => formatFileType(value),
      },
      {
        title: '大小',
        dataIndex: ['uploadMeta', 'size'],
        key: 'size',
        width: 120,
        render: (value: number) => formatFileSize(value),
      },
      {
        title: '状态',
        dataIndex: ['documentStatus', 'status'],
        key: 'status',
        width: 160,
        render: (value: string) => DOCUMENT_PROCESS.getLabel(value),
      },
      {
        title: '',
        key: 'action',
        width: 180,
        align: 'right',
        render: (_: unknown, record: PendingDocItem) => {
          const status = record.documentStatus.status;
          const hasDocumentId = record.documentId != null && record.documentId !== '';
          const retryDisabled = !hasDocumentId || !isDocumentRetryableStatus(status);
          const cancelDisabled = !hasDocumentId || !isDocumentCancelableStatus(status);
          return (
            <Space size={4}>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={retryDisabled || retryingId === record.documentId}
                onPress={() => {
                  if (record.documentId) runRetryPendingDoc(record.documentId);
                }}
              >
                重试
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={cancelDisabled || cancelingId === record.documentId}
                onPress={() => {
                  if (record.documentId) runCancelPendingDoc(record.documentId);
                }}
              >
                取消
              </Button>
            </Space>
          );
        },
      },
    ],
    [retryingId, cancelingId, runRetryPendingDoc, runCancelPendingDoc]
  );

  return (
    <div className={styles.wrapper}>
      <main className={styles.listArea}>
        <Table<PendingDocItem>
          rowKey={(record, index) =>
            record.documentId ??
            `${record.uploadMeta.documentName}-${record.uploadMeta.uploaderId ?? 'unknown'}-${String(index ?? 0)}`
          }
          dataSource={list}
          columns={columns}
          loading={listLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无上传队列" /> }}
        />
      </main>
    </div>
  );
}

export default UploadQueueTab;
