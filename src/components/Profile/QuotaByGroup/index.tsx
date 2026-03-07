import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import QuotaBar from '@/components/Common/QuotaBar';
import type { QuotaByGroupProps, UserGroupQuota } from './index.type';
import styles from './style.module.less';

type QuotaRecord = UserGroupQuota & { key: React.Key };

const QuotaByGroup: React.FC<QuotaByGroupProps> = ({
  quotas = [],
  pagination,
  total,
  current,
  pageSize: externalPageSize,
  onPageChange,
  loading = false,
}) => {
  const currentPage = current ?? 1;
  const pageSize = externalPageSize ?? pagination?.defaultPageSize ?? 10;

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
        render: (groupName: string) => (
          <span className={styles.groupNameItem}>{groupName}</span>
        ),
        sorter: (a, b) =>
          (a.groupName || '').localeCompare(b.groupName || '', 'zh-CN'),
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
    onPageChange?.(newPage, newPageSize);
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
