import React, { useMemo } from 'react';
import { usePagination } from 'ahooks';
import { Table } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import QuotaBar from '@/components/Common/QuotaBar';
import type { QuotaByGroupProps, UserGroupQuota } from './index.type';
import { useQuotaService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './style.module.less';

type QuotaRecord = UserGroupQuota & { key: React.Key };

const QuotaByGroup: React.FC<QuotaByGroupProps> = ({ pagination }) => {
  const quotaService = useQuotaService();
  const message = useAppMessage();

  const {
    data: quotaData,
    loading,
    pagination: {
      current: currentPage = 1,
      pageSize = pagination?.defaultPageSize ?? 10,
      onChange,
    },
  } = usePagination(
    async ({ current, pageSize: nextPageSize }) => {
      const { quotas, total } = await quotaService.fetchUserGroupQuotas(current, nextPageSize);
      return { list: quotas, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: pagination?.defaultPageSize ?? 10,
      onError: (error: unknown) => {
        message.error(parseErrorMessage(error, '获取配额数据失败'));
      },
    }
  );

  const quotas: UserGroupQuota[] = useMemo(() => quotaData?.list ?? [], [quotaData?.list]);
  const total = quotaData?.total ?? 0;

  const paginationConfig = {
    defaultPageSize: pagination?.defaultPageSize ?? 10,
    pageSizeOptions: pagination?.pageSizeOptions ?? [10, 20, 50],
    showSizeChanger: pagination?.showSizeChanger ?? true,
  };

  const dataSource = useMemo(
    () => quotas.map((quota) => ({ ...quota, key: quota.groupId })),
    [quotas]
  );

  const columns: TableColumnsType<QuotaRecord> = useMemo(
    () => [
      {
        key: 'groupName',
        title: '组名',
        dataIndex: 'groupName',
        align: 'center',
        render: (groupName: string) => <span className={styles.groupNameItem}>{groupName}</span>,
        sorter: (a, b) => (a.groupName || '').localeCompare(b.groupName || '', 'zh-CN'),
      },
      {
        key: 'quotaUsed',
        title: '已用配额',
        dataIndex: 'quotaUsed',
        align: 'center',
        render: (_: number, record: QuotaRecord) => (
          <div className={styles.quotaItem}>
            <QuotaBar used={record.quotaUsed} limit={record.quotaLimit} />
          </div>
        ),
        sorter: (a, b) => a.quotaUsed - b.quotaUsed,
      },
    ],
    []
  );

  const handleTableChange = (
    paginationCfg: TablePaginationConfig,
    _filters: unknown,
    _sorter: unknown
  ) => {
    let newPage = currentPage;
    let newPageSize = pageSize;

    if (paginationCfg.current !== undefined) {
      newPage = paginationCfg.current;
    }
    if (paginationCfg.pageSize !== undefined) {
      newPageSize = paginationCfg.pageSize;
      if (paginationCfg.current === undefined) {
        newPage = 1;
      }
    }
    onChange(newPage, newPageSize);
  };

  return (
    <div>
      <h3 className={styles.title}>我的组配额</h3>
      <Table<QuotaRecord>
        columns={columns}
        dataSource={dataSource}
        className={styles.tableWrapper}
        onChange={handleTableChange}
        loading={loading}
        pagination={{
          size: 'small',
          current: currentPage,
          pageSize,
          total: total ?? quotas.length,
          pageSizeOptions: paginationConfig.pageSizeOptions,
          showSizeChanger: paginationConfig.showSizeChanger,
          showTotal: (t) => `共 ${t} 个组`,
        }}
      />
    </div>
  );
};

export default QuotaByGroup;
