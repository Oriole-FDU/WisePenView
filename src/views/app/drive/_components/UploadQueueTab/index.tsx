import { DataTable, type DataTableColumn } from '@/components/Table';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, ProgressBar } from '@heroui/react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';
import { formatFileType, type UploadQueueRow } from './uploadQueueModel';
import { useUploadQueue } from './useUploadQueue';

function UploadQueueTab() {
  const { t } = useTranslation(['drive', 'common']);
  const { items, listLoading, retryingId, cancelingId, retryPendingDoc, cancelPendingDoc } =
    useUploadQueue();

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
                  if (row.documentId) retryPendingDoc(row.documentId);
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
                  if (row.documentId) cancelPendingDoc(row.documentId);
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

export default UploadQueueTab;
