import { DataTable, type DataTableColumn } from '@/components/Table';
import { useUserService } from '@/domains';
import type { AdminMessage } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import { Button, Chip, ListBox, Select, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import pageStyles from './style.module.less';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_TEXT = '-';

const formatOptionalText = (value?: string | number | null): string => {
  if (value == null) return EMPTY_TEXT;
  const text = String(value).trim();
  return text ? text : EMPTY_TEXT;
};

const formatDateTime = (value?: string | null): string => {
  const formatted = formatTimestampToDateTime(value);
  return formatted || EMPTY_TEXT;
};

function AnnouncementManagement() {
  const { t } = useTranslation(['admin', 'common']);
  const userService = useUserService();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data, loading, refresh } = useRequest(
    () => userService.listAdminMessages({ page: currentPage, size: pageSize }),
    {
      refreshDeps: [userService, currentPage, pageSize],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const columns = [
    {
      id: 'title',
      label: t('announcement.column.title'),
      width: 'lg',
      isRowHeader: true,
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell emphasis title={formatOptionalText(record.title)}>
          {formatOptionalText(record.title)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'messageType',
      label: t('announcement.column.type'),
      width: 'sm',
      renderCell: (record) => {
        const type = formatOptionalText(record.messageType);
        return (
          <Chip size="sm" variant="soft">
            <Chip.Label>{t(`announcement.type.${type}`, { defaultValue: type })}</Chip.Label>
          </Chip>
        );
      },
    },
    {
      id: 'deliveryScope',
      label: t('announcement.column.scope'),
      width: 'sm',
      renderCell: (record) => {
        const scope = formatOptionalText(record.deliveryScope);
        return (
          <Chip size="sm" variant="soft">
            <Chip.Label>{t(`announcement.scope.${scope}`, { defaultValue: scope })}</Chip.Label>
          </Chip>
        );
      },
    },
    {
      id: 'readStatus',
      label: t('announcement.column.status'),
      width: 'sm',
      renderCell: (record) => (
        <Chip size="sm" variant="soft" className={pageStyles.statusRead}>
          <Chip.Label>{t('announcement.readCount', { count: record.readCount ?? 0 })}</Chip.Label>
        </Chip>
      ),
    },
    {
      id: 'content',
      label: t('announcement.column.content'),
      width: 'fill',
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell title={formatOptionalText(record.content)}>
          {formatOptionalText(record.content)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'jumpUrl',
      label: t('announcement.column.jumpUrl'),
      width: 'lg',
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell muted title={formatOptionalText(record.jumpUrl)}>
          {formatOptionalText(record.jumpUrl)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'createTime',
      label: t('announcement.column.createTime'),
      width: 'lg',
      renderCell: (record) => (
        <DataTable.TextCell>{formatDateTime(record.createTime)}</DataTable.TextCell>
      ),
    },
  ] satisfies DataTableColumn<AdminMessage>[];

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setCurrentPage(nextPage);
    setPageSize(nextPageSize);
  };

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="announcements" />
      <DataTable<AdminMessage>
        ariaLabel={t('announcement.tableAria')}
        rowKey="messageId"
        items={messages}
        loading={loading}
        columns={columns}
        title={t('announcement.tableTitle')}
        emptyText={t('announcement.empty')}
        className={pageStyles.messageTable}
        maxBodyHeight={560}
        toolbar={
          <div className={pageStyles.toolbarActions}>
            <Button variant="secondary" size="sm" onPress={() => setCreateModalOpen(true)}>
              {t('announcement.create')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={loading}
              onPress={() => {
                void refresh();
              }}
            >
              {t('actions.refresh', { ns: 'common' })}
            </Button>
          </div>
        }
        pagination={{
          total,
          current: currentPage,
          pageSize,
          summary: t('announcement.total', { count: total }),
          onChange: handlePageChange,
          pageSizeControl: (
            <Select
              aria-label={t('announcement.pageSizeAria')}
              value={String(pageSize)}
              onChange={(key) => {
                if (key == null || Array.isArray(key)) return;
                handlePageChange(1, Number(key));
              }}
              className={pageStyles.pageSizeSelect}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <ListBox.Item
                      key={String(size)}
                      id={String(size)}
                      textValue={t('announcement.pageSize', { count: size })}
                    >
                      {t('announcement.pageSize', { count: size })}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ),
        }}
      />
      <CreateAnnouncementModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          if (currentPage === 1) {
            void refresh();
          } else {
            setCurrentPage(1);
          }
        }}
      />
    </div>
  );
}

export default AnnouncementManagement;
