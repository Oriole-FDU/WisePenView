import React, { useState, useEffect, useCallback } from 'react';
import QuotaByGroup from '@/components/Profile/QuotaByGroup';
import type { UserGroupQuota } from '@/types/quota';
import { QuotaServices } from '@/services/Quota';
import styles from './style.module.less';

const Usage: React.FC = () => {
  const [quotas, setQuotas] = useState<UserGroupQuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuotas = useCallback(async (currentPage: number, currentPageSize: number) => {
    try {
      setLoading(true);
      const { quotas: list, total: totalCount } = await QuotaServices.fetchUserGroupQuotas(
        currentPage,
        currentPageSize
      );
      setQuotas(list);
      setTotal(totalCount);
    } catch (error) {
      console.error('获取配额数据失败:', error);
      setQuotas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotas(page, pageSize);
  }, [fetchQuotas, page, pageSize]);

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>余额与使用量</h1>
        <span className={styles.pageSubtitle}>查看您在各小组中的配额使用情况</span>
      </div>
      <QuotaByGroup
        quotas={quotas}
        total={total}
        current={page}
        pageSize={pageSize}
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Usage;
