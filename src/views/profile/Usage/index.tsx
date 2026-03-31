/**
 * 个人中心「余额与使用量」：上半部分为个人计算点钱包（余额 + 点卡充值 + 流水），
 * 下半部分仍为各小组配额（QuotaByGroup），二者数据来源不同、互不替代。
 */
import React from 'react';
import QuotaByGroup from '@/components/Profile/QuotaByGroup';
import ComputeWallet from '@/components/Wallet/ComputeWallet';
import { WALLET_TARGET_TYPE } from '@/constants/wallet';
import layout from '../style.module.less';

const Usage: React.FC = () => {
  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>余额与使用量</h1>
        <span className={layout.pageSubtitle}>
          查看个人计算点余额、点卡充值记录，以及在各小组中的配额使用情况
        </span>
      </div>
      <div className={`${layout.formSection} ${layout.walletSkeletonWrap}`}>
        <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} canRecharge />
      </div>
      <QuotaByGroup
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
      />
    </div>
  );
};

export default Usage;
