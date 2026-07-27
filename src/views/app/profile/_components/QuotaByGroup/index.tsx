import QuotaBar from '@/components/QuotaBar';
import { DataTable, type DataTableColumn } from '@/components/Table';
import { useQuotaService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast, type SortDescriptor } from '@heroui/react';
import { usePagination } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuotaByGroupProps, UserGroupQuota } from './index.type';
import styles from './style.module.less';

type QuotaRecord = UserGroupQuota & { key: string };

const DEFAULT_PAGE_SIZE = 10;

function QuotaByGroup({ pagination }: QuotaByGroupProps) {
  const { t } = useTranslation('group');
  const quotaService = useQuotaService();
  const {
    data: quotaData,
    loading,
    pagination: {
      current: currentPage = 1,
      pageSize = pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      onChange,
    },
  } = usePagination(
    async ({ current, pageSize: nextPageSize }) => {
      const { quotas, total } = await quotaService.fetchUserGroupQuotas(current, nextPageSize);
      return { list: quotas, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const quotas: UserGroupQuota[] = quotaData?.list ?? [];
  const total = quotaData?.total ?? 0;
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  const dataSource = quotas.map((quota) => ({ ...quota, key: quota.groupId || quota.groupName }));

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'groupName',
    direction: 'ascending',
  });

  const columns = [
    {
      id: 'groupName',
      label: t('quota.columns.group'),
      width: 'md',
      align: 'start',
      allowsSorting: true,
      isRowHeader: true,
      getSortValue: (row) => row.groupName,
      renderCell: (row) => (
        <DataTable.TextCell emphasis className={styles.groupNameItem}>
          {row.groupName || t('quota.unnamedGroup')}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'quotaUsed',
      label: t('quota.columns.usage'),
      width: 'fill',
      align: 'start',
      allowsSorting: true,
      getSortValue: (row) => row.quotaUsed,
      renderCell: (row) => (
        <div className={styles.quotaItem}>
          <QuotaBar used={row.quotaUsed} limit={row.quotaLimit} />
        </div>
      ),
    },
  ] satisfies DataTableColumn<QuotaRecord>[];

  const summary = total > 0 ? t('quota.summary', { start, end, total }) : t('quota.empty');

  return (
    <div>
      <DataTable
        ariaLabel={t('quota.tableAria')}
        className={styles.table}
        items={dataSource}
        rowKey="key"
        columns={columns}
        loading={loading}
        emptyText={t('quota.empty')}
        title={t('quota.title')}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        summary={summary}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          onChange,
        }}
      />
    </div>
  );
}

export default QuotaByGroup;
