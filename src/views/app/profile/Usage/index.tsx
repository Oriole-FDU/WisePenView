/**
 * 个人中心「余额与使用量」（左下角入口）：个人钱包 + 各小组配额放在同一 formSection，
 * 钱包使用 ComputeWallet surface="plain"，避免外层盒子与组件内 card 叠成双层页签感。
 */
import QuotaByGroup from '@/components/Profile/QuotaByGroup';
import ComputeWallet from '@/components/Wallet/ComputeWallet';
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import layout from '../style.module.less';

function Usage() {
  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>余额与使用量</h1>
        <span className={layout.pageSubtitle}>
          查看个人计算点余额、点卡充值记录，以及在各小组中的配额使用情况
        </span>
      </div>
      <div className={layout.formSection}>
        <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} canRecharge surface="plain" />
        <div className={layout.sectionDivider} />
        <QuotaByGroup
          pagination={{
            defaultPageSize: 10,
          }}
        />
      </div>
    </div>
  );
}

export default Usage;
