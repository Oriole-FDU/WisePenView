/**
 * 个人中心「余额与使用量」：上半部分为个人计算点钱包（余额 + 点卡充值 + 流水），
 * 下半部分仍为各小组配额（QuotaByGroup），二者数据来源不同、互不替代。
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Skeleton } from 'antd';
import QuotaByGroup from '@/components/Profile/QuotaByGroup';
import ComputeWallet from '@/components/Wallet/ComputeWallet';
import { WALLET_TARGET_TYPE } from '@/constants/wallet';
import type { UserGroupQuota } from '@/types/quota';
import { useQuotaService, useUserService } from '@/contexts/ServicesContext';
import layout from '../style.module.less';

const Usage: React.FC = () => {
  const userService = useUserService();
  const quotaService = useQuotaService();
  /** 当前登录用户 id，供个人钱包 targetId；与 User 模型一致使用 string */
  const [userId, setUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [quotas, setQuotas] = useState<UserGroupQuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuotas = useCallback(
    async (currentPage: number, currentPageSize: number) => {
      try {
        setLoading(true);
        const { quotas: list, total: totalCount } = await quotaService.fetchUserGroupQuotas(
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
    },
    [quotaService]
  );

  useEffect(() => {
    fetchQuotas(page, pageSize);
  }, [fetchQuotas, page, pageSize]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUserLoading(true);
        const u = await userService.getUserInfo();
        setUserId(u.id);
      } catch {
        setUserId(null);
      } finally {
        setUserLoading(false);
      }
    };
    void loadUser();
  }, [userService]);

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>余额与使用量</h1>
        <span className={layout.pageSubtitle}>
          查看个人计算点余额、点卡充值记录，以及在各小组中的配额使用情况
        </span>
      </div>
      {/* 先解析出 userId 再挂载钱包，避免 targetId 为空触发无效请求；等待期间用骨架占位 */}
      {userLoading ? (
        <div className={`${layout.formSection} ${layout.walletSkeletonWrap}`}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : userId ? (
        <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} targetId={userId} canRecharge />
      ) : null}
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
