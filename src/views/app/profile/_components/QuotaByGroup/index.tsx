import { type SortDescriptor } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import QuotaBar from '@/components/base/QuotaBar';
import { DataTable, type DataTableColumn } from '@/components/base/Table';
import { useQuotaService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { QuotaByGroupProps, UserGroupQuota } from './index.type';
import styles from './style.module.less';

type QuotaRecord = UserGroupQuota & { key: string };

const DEFAULT_PAGE_SIZE = 10;

interface QuotaPageData {
  quotas: UserGroupQuota[];
  total: number;
  currentPage: number;
}

const INITIAL_QUOTA_PAGE_DATA: QuotaPageData = {
  quotas: [],
  total: 0,
  currentPage: 0,
};

function QuotaByGroup({ pagination }: QuotaByGroupProps) {
  const { t } = useTranslation('group');
  const quotaService = useQuotaService();
  const pageSize = pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const [quotaPageData, setQuotaPageData] = useState<QuotaPageData>(INITIAL_QUOTA_PAGE_DATA);

  const fetchQuotaPage = async (page: number): Promise<QuotaPageData> => {
    const { quotas, total } = await quotaService.fetchUserGroupQuotas(page, pageSize);
    return { quotas, total, currentPage: page };
  };

  const { loading } = useApi(() => fetchQuotaPage(1), {
    refreshDeps: [quotaService, pageSize],
    onBefore: () => {
      setQuotaPageData(INITIAL_QUOTA_PAGE_DATA);
    },
    onSuccess: (data) => {
      setQuotaPageData(data);
    },
  });

  const hasMore =
    quotaPageData.currentPage > 0 && quotaPageData.currentPage * pageSize < quotaPageData.total;

  const { loading: loadingMore, run: loadMore } = useApi(
    async (): Promise<QuotaPageData> => {
      const canLoadMore =
        quotaPageData.currentPage > 0 && quotaPageData.currentPage * pageSize < quotaPageData.total;
      if (!canLoadMore) {
        return quotaPageData;
      }

      const nextPageData = await fetchQuotaPage(quotaPageData.currentPage + 1);
      return {
        quotas: [...quotaPageData.quotas, ...nextPageData.quotas],
        total: nextPageData.total,
        currentPage: nextPageData.currentPage,
      };
    },
    {
      manual: true,
      onSuccess: (data) => {
        setQuotaPageData(data);
      },
    }
  );

  const total = quotaPageData.total;
  const dataSource = quotaPageData.quotas.map((quota) => ({
    ...quota,
    key: quota.groupId || quota.groupName,
  }));
  const loadedCount = dataSource.length;
  const start = loadedCount === 0 ? 0 : 1;
  const end = Math.min(loadedCount, total);

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
        loadMore={{
          hasMore,
          loading: loadingMore,
          onLoadMore: loadMore,
        }}
      />
    </div>
  );
}

export default QuotaByGroup;
